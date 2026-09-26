package books

import "github.com/antflaherty/mybookshelf/backend/domain"

type BookSearchProvider interface {
	SearchBooksByTitle(title string) ([]domain.Book, error)
}
