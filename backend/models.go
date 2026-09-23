package main

type User struct {
	ID           string
	Email        string
	PasswordHash string
}

type book struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type bookmark struct {
	UserID      string
	BookID      string `json:"bookId"`
	CurrentPage int    `json:"currentPage"`
}

type qualifiedBookmark struct {
	book
	bookmark
}
