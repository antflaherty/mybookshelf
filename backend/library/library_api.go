package library

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

type openLibraryBookResponse struct {
	Key                 string   `json:"key"`
	Title               string   `json:"title"`
	AuthorNames         []string `json:"author_name"`
	NumberOfPagesMedian int      `json:"number_of_pages_median"`
}

type openLibrarySearchResponse struct {
	Docs []openLibraryBookResponse `json:"docs"`
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

func NewOpenLibrarySearchService() *OpenLibrarySearchService {
	return &OpenLibrarySearchService{}
}
