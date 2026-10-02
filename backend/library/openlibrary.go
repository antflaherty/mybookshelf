package library

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"

	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
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

type OpenLibrarySearchService struct {
}

const baseUrl = "https://openlibrary.org"
const coversUrl = "https://covers.openlibrary.org/b/id/"
const searchRoute = "/search.json"

func (service OpenLibrarySearchService) SearchBooksByTitle(title string, limit int, page int) ([]domain.Book, error) {
	return searchBooks(searchBooksQuery{Title: title}, limit, page)
}

func (service OpenLibrarySearchService) GetBookDetails(bookId string) (*books.BookDetails, error) {
	worksUrl, err := url.JoinPath(
		baseUrl,
		url.PathEscape(bookId)+".json",
	)

	if err != nil {
		return nil, err
	}

	response, err := http.Get(worksUrl)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	var worksResponse openLibraryWorksResponse

	err = json.NewDecoder(response.Body).Decode(&worksResponse)

	if err != nil {
		return nil, err
	}

	genreIds := worksResponse.Genres

	genres := make([]string, len(genreIds))

	for i, genreId := range genreIds {
		tagsUrl, err := url.JoinPath(
			baseUrl,
			url.PathEscape(genreId)+".json",
		)
		if err != nil {
			return nil, err
		}

		response, err := http.Get(tagsUrl)
		if err != nil {
			return nil, err
		}
		defer response.Body.Close()

		var genreResponse openLibraryTagsResponse

		err = json.NewDecoder(response.Body).Decode(&genreResponse)

		if err != nil {
			return nil, err
		}

		genres[i] = genreResponse.Name
	}

	bookResults, err := searchBooks(searchBooksQuery{Key: bookId}, 1, 1)

	if err != nil {
		return nil, err
	}

	var book domain.Book
	if len(bookResults) > 0 {
		book = bookResults[0]
	} else {
		return nil, errors.New("book not found")
	}

	bookDetails := &books.BookDetails{ID: bookId, Blurb: string(worksResponse.Description), Genres: genres, Book: book}

	return bookDetails, nil
}

func NewOpenLibrarySearchService() *OpenLibrarySearchService {
	return &OpenLibrarySearchService{}
}

type searchBooksQuery struct {
	Title string
	Key   string
}

func searchBooks(query searchBooksQuery, limit int, page int) ([]domain.Book, error) {
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

	requestURL := baseUrl + searchRoute + "?" + params.Encode()

	response, err := http.Get(requestURL)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	var searchResponse openLibrarySearchResponse

	err = json.NewDecoder(response.Body).Decode(&searchResponse)

	if err != nil {
		return nil, err
	}

	allBooks := make([]domain.Book, len(searchResponse.Docs))

	for i, bookResponse := range searchResponse.Docs {
		author := ""

		if len(bookResponse.AuthorNames) > 0 {
			author = bookResponse.AuthorNames[0]
		}

		book := domain.Book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: bookResponse.NumberOfPagesMedian, CoverUri: getCoverUri(bookResponse.CoverI)}
		allBooks[i] = book
	}

	return allBooks, nil
}

func getCoverUri(coverId int) string {
	var coverUri string

	if coverId > 0 {
		coverUri = coversUrl + strconv.Itoa(coverId) + "-M.jpg"
	}

	return coverUri
}
