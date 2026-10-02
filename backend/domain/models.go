package domain

type Book struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
	CoverUri  string `json:"coverUri"`
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

type Review struct {
	UserID              string  `json:"userID"`
	BookID              string  `json:"bookId"`
	Stars               int     `json:"stars"`
	CreatedTimestamp    string  `json:"createdTimestamp"`
	LastEditedTimestamp string  `json:"lastEditedTimestamp"`
	Comment             *string `json:"comment"`
}
