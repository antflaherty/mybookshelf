package books

import (
	"database/sql"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

func QueryAllBooks(db *sql.DB) (*[]domain.Book, error) {
	sqlString := "SELECT id, title, author, page_count FROM book"

	rows, err := db.Query(sqlString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []domain.Book
	for rows.Next() {
		b := &domain.Book{}
		var coverUri sql.NullString
		err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount, &coverUri)
		if err != nil {
			return nil, err
		}
		b.CoverUri = coverUri.String
		books = append(books, *b)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &books, nil
}

func QueryBookById(db *sql.DB, id string) (*domain.Book, error) {
	sqlString := "SELECT id, title, author, page_count, cover_uri FROM book WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &domain.Book{}
	var coverUri sql.NullString
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount, &coverUri)
	if err != nil {
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
