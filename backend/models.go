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

type shelf struct {
	ID        string              `json:"id"`
	UserID    string              `json:"userId"`
	Name      string              `json:"name"`
	Bookmarks []qualifiedBookmark `json:"bookmarks"`
}

type bookmark struct {
	UserID      string
	ShelfID     string
	BookID      string `json:"bookId"`
	CurrentPage int    `json:"currentPage"`
}

type qualifiedBookmark struct {
	book
	bookmark
}
