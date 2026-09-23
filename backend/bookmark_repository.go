package main

import "database/sql"

func queryAllBookmarks(db *sql.DB) (*[]qualifiedBookmark, error) {
	sqlString := "SELECT Bookmark.BookId, Bookmark.CurrentPage, Books.Title, Books.Author, Books.PageCount FROM Bookmark INNER JOIN Books ON Bookmark.BookId=Books.Id"

	rows, err := db.Query(sqlString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allBookmarks []qualifiedBookmark
	for rows.Next() {
		bookmark := &qualifiedBookmark{}
		err := rows.Scan(&bookmark.book.ID, &bookmark.CurrentPage, &bookmark.Title, &bookmark.Author, &bookmark.PageCount)
		if err != nil {
			return nil, err
		}
		allBookmarks = append(allBookmarks, *bookmark)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &allBookmarks, nil
}

func queryBookmarkByBookId(db *sql.DB, bookId string) (*bookmark, error) {
	sqlString := "SELECT * FROM Bookmark WHERE BookId = ?"
	row := db.QueryRow(sqlString, bookId)
	bm := &bookmark{}
	err := row.Scan(&bm.BookID, &bm.CurrentPage)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return bm, nil
}

func upsertBookmark(db *sql.DB, bm *bookmark) error {
	existingRp, err := queryBookmarkByBookId(db, bm.BookID)

	if err != nil {
		return err
	}

	if existingRp == nil {
		sqlString := "INSERT INTO Bookmark (BookId, CurrentPage) VALUES (?, ?);"

		_, err := db.Exec(sqlString, bm.BookID, bm.CurrentPage)
		return err
	}

	sqlString := `UPDATE Bookmark SET CurrentPage = ? WHERE BookId = ?;`
	_, err = db.Exec(sqlString, bm.CurrentPage, bm.BookID)
	return err
}
