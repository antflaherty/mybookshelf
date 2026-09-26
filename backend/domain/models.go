package domain

type Book struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type Bookmark struct {
	UserID      string
	ShelfID     string `json:"shelfId"`
	BookID      string
	CurrentPage int `json:"currentPage"`
}

type QualifiedBookmark struct {
	Book Book `json:"book"`
	Bookmark
}

type Shelf struct {
	ID        string              `json:"id"`
	SortOrder int                 `json:"sortOrder"`
	UserID    string              `json:"userId"`
	Name      string              `json:"name"`
	Bookmarks []QualifiedBookmark `json:"bookmarks"`
}
