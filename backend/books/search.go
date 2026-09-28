package books

import "github.com/antflaherty/mybookshelf/backend/domain"

type BookSearchProvider interface {
	SearchBooksByTitle(title string, limit int, page int) ([]domain.Book, error)
}
