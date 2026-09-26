package library

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

type openLibraryBookResponse struct {
	Key         string   `json:"key"`
	Title       string   `json:"title"`
	AuthorNames []string `json:"author_name"`
}

type openLibrarySearchResponse struct {
	Docs []openLibraryBookResponse `json:"docs"`
}

func SearchBooksByTitle(title string) ([]domain.Book, error) {
	baseURL := "https://openlibrary.org/search.json"

	params := url.Values{}
	params.Set("q", "title:"+title)
	params.Set("fields", "key,title,author_name")

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
		book := domain.Book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: 0}
		allBooks[i] = book
	}

	return allBooks, nil
}
