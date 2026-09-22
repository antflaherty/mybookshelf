package main

type book struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type readingProgress struct {
	BookID      string `json:"bookId"`
	CurrentPage int    `json:"currentPage"`
}

type qualifiedReadingProgress struct {
	book
	readingProgress
}
