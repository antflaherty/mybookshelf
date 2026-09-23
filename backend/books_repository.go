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
	sqlString := "SELECT * FROM Books WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &book{}
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
	if err != nil {
		return nil, err
	}
	return b, nil
}
