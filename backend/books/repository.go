package books

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

// ErrBookNotFound reports that no row in the book table matched the id.
// Exported because the bookmarks and reviews packages look books up through
// QueryBookById and need to tell "no such book" from "the database is down".
var ErrBookNotFound = errors.New("book not found")

func QueryBookById(db *sql.DB, id string) (*domain.Book, error) {
	sqlString := "SELECT id, title, author, page_count, cover_uri FROM book WHERE id = $1"
	row := db.QueryRow(sqlString, id)
	b := &domain.Book{}
	var coverUri sql.NullString
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount, &coverUri)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: %s", ErrBookNotFound, id)
		}
		return nil, err
	}
	b.CoverUri = coverUri.String
	return b, nil
}

func insertBook(db *sql.DB, book *domain.Book) error {

	sqlString := "INSERT INTO book (id, title, author, page_count, cover_uri) VALUES ($1, $2, $3, $4, $5);"

	_, err := db.Exec(sqlString, book.ID, book.Title, book.Author, book.PageCount, book.CoverUri)
	return err

}
