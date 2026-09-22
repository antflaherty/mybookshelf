package main

import "database/sql"

func queryAllReadingProgress(db *sql.DB) (*[]qualifiedReadingProgress, error) {
	sqlString := "SELECT ReadingProgress.BookId, ReadingProgress.CurrentPage, Books.Title, Books.Author, Books.PageCount FROM ReadingProgress INNER JOIN Books ON ReadingProgress.BookId=Books.Id"

	rows, err := db.Query(sqlString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allReadingProgress []qualifiedReadingProgress
	for rows.Next() {
		readingProgress := &qualifiedReadingProgress{}
		err := rows.Scan(&readingProgress.book.ID, &readingProgress.CurrentPage, &readingProgress.Title, &readingProgress.Author, &readingProgress.PageCount)
		if err != nil {
			return nil, err
		}
		allReadingProgress = append(allReadingProgress, *readingProgress)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &allReadingProgress, nil
}

func queryReadingProgressByBookId(db *sql.DB, bookId string) (*readingProgress, error) {
	sqlString := "SELECT * FROM ReadingProgress WHERE BookId = ?"
	row := db.QueryRow(sqlString, bookId)
	rp := &readingProgress{}
	err := row.Scan(&rp.BookID, &rp.CurrentPage)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rp, nil
}

func upsertReadingProgress(db *sql.DB, rp *readingProgress) error {
	existingRp, err := queryReadingProgressByBookId(db, rp.BookID)

	if err != nil {
		return err
	}

	if existingRp == nil {
		sqlString := "INSERT INTO ReadingProgress (BookId, CurrentPage) VALUES (?, ?);"

		_, err := db.Exec(sqlString, rp.BookID, rp.CurrentPage)
		return err
	}

	sqlString := `UPDATE ReadingProgress SET CurrentPage = ? WHERE BookId = ?;`
	_, err = db.Exec(sqlString, rp.CurrentPage, rp.BookID)
	return err
}
