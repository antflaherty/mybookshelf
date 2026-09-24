package main

import (
	"encoding/json"
	"net/http"
	"net/url"
)

type openLibraryBookResponse struct {
	Key         string   `json:"key"`
	Title       string   `json:"title"`
	AuthorNames []string `json:"author_name"`
}

type openLibrarySearchResponse struct {
	Docs []openLibraryBookResponse `json:"docs"`
}

func searchBooksByTitle(title string) ([]book, error) {
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

	books := make([]book, len(searchResponse.Docs))

	for i, bookResponse := range searchResponse.Docs {
		author := ""

		if len(bookResponse.AuthorNames) > 0 {
			author = bookResponse.AuthorNames[0]
		}
		book := book{ID: bookResponse.Key, Title: bookResponse.Title, Author: author, PageCount: 0}
		books[i] = book
	}

	return books, nil
}
