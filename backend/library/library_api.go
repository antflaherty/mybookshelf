package library

import (
	"encoding/json"
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
	Covers      []int                  `json:"covers"`
	Genres      []string               `json:"genres"`
}

type openLibraryTagsResponse struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type OpenLibrarySearchService struct {
}

func (service OpenLibrarySearchService) SearchBooksByTitle(title string, limit int, page int) ([]domain.Book, error) {
	baseURL := "https://openlibrary.org/search.json"

	params := url.Values{}
	params.Set("q", "title:"+title)
	params.Set("fields", "key,title,author_name,number_of_pages_median,cover_i")
	params.Set("limit", strconv.Itoa(limit))
	params.Set("page", strconv.Itoa(page))

	requestURL := baseURL + "?" + params.Encode()

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

		var coverUri string

		if bookResponse.CoverI > 0 {
			coverUri = "https://covers.openlibrary.org/b/id/" + strconv.Itoa(bookResponse.CoverI) + "-M.jpg"
		}

		book := domain.Book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: bookResponse.NumberOfPagesMedian, CoverUri: coverUri}
		allBooks[i] = book
	}

	return allBooks, nil
}

func (service OpenLibrarySearchService) GetBookDetails(bookId string) (*books.BookDetails, error) {
	worksUrl, err := url.JoinPath(
		"https://openlibrary.org",
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
			"https://openlibrary.org",
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

	var coverUri string

	if len(worksResponse.Covers) > 0 {
		coverUri = "https://covers.openlibrary.org/b/id/" + strconv.Itoa(worksResponse.Covers[0]) + "-M.jpg"
	}

	bookDetails := &books.BookDetails{ID: bookId, Blurb: string(worksResponse.Description), Genres: genres, CoverUri: coverUri}

	return bookDetails, nil
}

func NewOpenLibrarySearchService() *OpenLibrarySearchService {
	return &OpenLibrarySearchService{}
}
