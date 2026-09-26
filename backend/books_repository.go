package main

import (
	"database/sql"
)

func queryAllBooks(db *sql.DB) (*[]book, error) {
	sqlString := "SELECT Id, Title, Author, PageCount FROM Books"

	rows, err := db.Query(sqlString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []book
	for rows.Next() {
		b := &book{}
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

func queryBookById(db *sql.DB, id string) (*book, error) {
	// something wrong here - didn't select a book when inserting from a different user
	sqlString := "SELECT * FROM Books WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &book{}
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func insertBook(db *sql.DB, book *book) error {

	sqlString := "INSERT INTO books (id, title, author, PageCount) VALUES (?, ?, ?, ?);"

	_, err := db.Exec(sqlString, book.ID, book.Title, book.Author, book.PageCount)
	return err

}
