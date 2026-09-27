package library

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
)

type openLibrarySearchBookResponse struct {
	Key                 string   `json:"key"`
	Title               string   `json:"title"`
	AuthorNames         []string `json:"author_name"`
	NumberOfPagesMedian int      `json:"number_of_pages_median"`
}

type openLibrarySearchResponse struct {
	Docs []openLibrarySearchBookResponse `json:"docs"`
}

type openLibraryWorksResponse struct {
	Key         string   `json:"key"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Genres      []string `json:"genres"`
}

type openLibraryTagsResponse struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type OpenLibrarySearchService struct {
}

func (service OpenLibrarySearchService) SearchBooksByTitle(title string) ([]domain.Book, error) {
	baseURL := "https://openlibrary.org/search.json"

	params := url.Values{}
	params.Set("q", "title:"+title)
	params.Set("fields", "key,title,author_name,number_of_pages_median")

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

		book := domain.Book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: bookResponse.NumberOfPagesMedian}
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

	bookDetails := &books.BookDetails{ID: bookId, Blurb: worksResponse.Description, Genres: genres}

	return bookDetails, nil
}

func NewOpenLibrarySearchService() *OpenLibrarySearchService {
	return &OpenLibrarySearchService{}
}
