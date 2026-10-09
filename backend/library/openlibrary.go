package library

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
)

// Sentinels for the two ways an Open Library call can fail in a way the API
// must report differently. books re-exports these, so the handler can classify
// an error without this package importing it (it already imports books).
var (
	ErrBookNotFound = books.ErrBookNotFound
	ErrUpstream     = books.ErrUpstream
)

type openLibrarySearchBookResponse struct {
	Key                 string   `json:"key"`
	Title               string   `json:"title"`
	AuthorNames         []string `json:"author_name"`
	NumberOfPagesMedian int      `json:"number_of_pages_median"`
	CoverI              int      `json:"cover_i"`
}

type openLibrarySearchResponse struct {
	Docs []openLibrarySearchBookResponse `json:"docs"`
}

type openLibraryDescription string

// openlibrary can return works description as string or as an object with a value
func (d *openLibraryDescription) UnmarshalJSON(data []byte) error {
	var stringValue string
	if err := json.Unmarshal(data, &stringValue); err == nil {
		*d = openLibraryDescription(stringValue)
		return nil
	}

	var objectValue struct {
		Value string `json:"value"`
	}

	if err := json.Unmarshal(data, &objectValue); err != nil {
		return err
	}

	*d = openLibraryDescription(objectValue.Value)
	return nil
}

type openLibraryWorksResponse struct {
	Key         string                 `json:"key"`
	Title       string                 `json:"title"`
	Description openLibraryDescription `json:"description"`
	Genres      []string               `json:"genres"`
}

type openLibraryTagsResponse struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

const requestTimeout = 10 * time.Second

type OpenLibrarySearchService struct {
	client *http.Client
	// baseUrl and coversUrl are fields so tests can point the service at an
	// httptest server. They default to the production hosts.
	baseUrl   string
	coversUrl string
}

const defaultBaseUrl = "https://openlibrary.org"
const defaultCoversUrl = "https://covers.openlibrary.org/b/id/"
const searchRoute = "/search.json"

func (service OpenLibrarySearchService) SearchBooksByTitle(title string, limit int, page int) ([]domain.Book, error) {
	return searchBooks(service, searchBooksQuery{Title: title}, limit, page)
}

func (service OpenLibrarySearchService) GetBookDetails(bookId string) (*books.BookDetails, error) {
	worksUrl, err := url.JoinPath(
		service.baseUrl,
		url.PathEscape(bookId)+".json",
	)

	if err != nil {
		return nil, fmt.Errorf("%w: building works url: %w", ErrUpstream, err)
	}

	worksBody, err := service.get(worksUrl)
	if err != nil {
		return nil, err
	}

	var worksResponse openLibraryWorksResponse

	if err := json.Unmarshal(worksBody, &worksResponse); err != nil {
		return nil, fmt.Errorf("%w: decoding works response: %w", ErrUpstream, err)
	}

	genreIds := worksResponse.Genres

	genres := make([]string, len(genreIds))

	for i, genreId := range genreIds {
		tagsUrl, err := url.JoinPath(
			service.baseUrl,
			url.PathEscape(genreId)+".json",
		)
		if err != nil {
			return nil, fmt.Errorf("%w: building genre url: %w", ErrUpstream, err)
		}

		tagsBody, err := service.get(tagsUrl)

		// A genre name is decoration. Losing one is not worth failing the whole
		// request over, so log it and leave that genre blank.
		if err != nil {
			slog.Warn("open library genre lookup failed", "genreId", genreId, "error", err)
			continue
		}

		var genreResponse openLibraryTagsResponse

		if err := json.Unmarshal(tagsBody, &genreResponse); err != nil {
			slog.Warn("open library genre response unparseable", "genreId", genreId, "error", err)
			continue
		}

		genres[i] = genreResponse.Name
	}

	bookResults, err := searchBooks(service, searchBooksQuery{Key: bookId}, 1, 1)

	if err != nil {
		return nil, err
	}

	var book domain.Book
	if len(bookResults) > 0 {
		book = bookResults[0]
	} else {
		return nil, fmt.Errorf("%w: %s", ErrBookNotFound, bookId)
	}

	bookDetails := &books.BookDetails{ID: bookId, Blurb: string(worksResponse.Description), Genres: genres, Book: book}

	return bookDetails, nil
}

func NewOpenLibrarySearchService() *OpenLibrarySearchService {
	return &OpenLibrarySearchService{
		client: &http.Client{
			Timeout: requestTimeout,
		},
		baseUrl:   defaultBaseUrl,
		coversUrl: defaultCoversUrl,
	}
}

type searchBooksQuery struct {
	Title string
	Key   string
}

func searchBooks(service OpenLibrarySearchService, query searchBooksQuery, limit int, page int) ([]domain.Book, error) {
	var queryString string
	if query.Title != "" {
		queryString += "title:" + query.Title
	}
	if query.Key != "" {
		queryString += "key:" + query.Key
	}

	params := url.Values{}
	params.Set("q", queryString)
	params.Set("fields", "key,title,author_name,number_of_pages_median,cover_i")

	if limit > 0 {
		params.Set("limit", strconv.Itoa(limit))
	}

	if page > 0 {
		params.Set("page", strconv.Itoa(page))
	}

	requestURL := service.baseUrl + searchRoute + "?" + params.Encode()

	body, err := service.get(requestURL)
	if err != nil {
		return nil, err
	}

	var searchResponse openLibrarySearchResponse

	if err := json.Unmarshal(body, &searchResponse); err != nil {
		return nil, fmt.Errorf("%w: decoding search response: %w", ErrUpstream, err)
	}

	allBooks := make([]domain.Book, len(searchResponse.Docs))

	for i, bookResponse := range searchResponse.Docs {
		author := ""

		if len(bookResponse.AuthorNames) > 0 {
			author = bookResponse.AuthorNames[0]
		}

		book := domain.Book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: bookResponse.NumberOfPagesMedian, CoverUri: service.getCoverUri(bookResponse.CoverI)}
		allBooks[i] = book
	}

	return allBooks, nil
}

// get performs a request and returns the body, mapping transport and
// non-2xx failures to ErrUpstream and 404 to ErrBookNotFound.
//
// It does not decode JSON: a 2xx body that will not parse is still an upstream
// fault, and the caller knows which shape it expects.
func (service OpenLibrarySearchService) get(requestUrl string) ([]byte, error) {
	response, err := service.client.Get(requestUrl)

	if err != nil {
		var urlErr *url.Error

		if errors.As(err, &urlErr) && urlErr.Timeout() {
			return nil, fmt.Errorf("%w: timeout requesting %s: %w", ErrUpstream, requestUrl, err)
		}

		return nil, fmt.Errorf("%w: requesting %s: %w", ErrUpstream, requestUrl, err)
	}

	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound || response.StatusCode == http.StatusGone {
		return nil, fmt.Errorf("%w: %s", ErrBookNotFound, requestUrl)
	}

	if response.StatusCode < 200 || response.StatusCode > 299 {
		// Log the status and URL, never the body: Open Library error pages can
		// be large and echoing them serves nobody.
		slog.Error("open library returned a non-2xx status", "status", response.StatusCode, "url", requestUrl)
		return nil, fmt.Errorf("%w: %s returned %d", ErrUpstream, requestUrl, response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: reading response body: %w", ErrUpstream, err)
	}

	return body, nil
}

func (service OpenLibrarySearchService) getCoverUri(coverId int) string {
	return coverUriFor(service.coversUrl, coverId)
}

// getCoverUri builds a cover URL against the production covers host.
func getCoverUri(coverId int) string {
	return coverUriFor(defaultCoversUrl, coverId)
}

func coverUriFor(coversUrl string, coverId int) string {
	var coverUri string

	if coverId > 0 {
		coverUri = coversUrl + strconv.Itoa(coverId) + "-M.jpg"
	}

	return coverUri
}
