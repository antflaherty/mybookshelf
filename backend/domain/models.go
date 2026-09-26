package domain

type Book struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type Bookmark struct {
	UserID      string
	ShelfID     string
	BookID      string `json:"bookId"`
	CurrentPage int    `json:"currentPage"`
}

type QualifiedBookmark struct {
	Book
	Bookmark
}

type Shelf struct {
	ID        string              `json:"id"`
	SortOrder int                 `json:"sortOrder"`
	UserID    string              `json:"userId"`
	Name      string              `json:"name"`
	Bookmarks []QualifiedBookmark `json:"bookmarks"`
}
