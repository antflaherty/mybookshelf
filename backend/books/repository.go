package books

import (
	"database/sql"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

func QueryAllBooks(db *sql.DB) (*[]domain.Book, error) {
	sqlString := "SELECT Id, Title, Author, PageCount FROM Books"

	rows, err := db.Query(sqlString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []domain.Book
	for rows.Next() {
		b := &domain.Book{}
		err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
		if err != nil {
			return nil, err
		}
		books = append(books, *b)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &books, nil
}

func QueryBookById(db *sql.DB, id string) (*domain.Book, error) {
	sqlString := "SELECT * FROM Books WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &domain.Book{}
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func insertBook(db *sql.DB, book *domain.Book) error {

	sqlString := "INSERT INTO books (id, title, author, PageCount) VALUES (?, ?, ?, ?);"

	_, err := db.Exec(sqlString, book.ID, book.Title, book.Author, book.PageCount)
	return err

}
