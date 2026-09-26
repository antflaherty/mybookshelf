package main

import (
	"database/sql"
)

func queryAllBookmarks(db *sql.DB, userID string) (*[]qualifiedBookmark, error) {
	sqlString := "SELECT Bookmark.shelf_id, Bookmark.book_id, Bookmark.current_page, Books.Title, Books.Author, Books.PageCount FROM Bookmark INNER JOIN Books ON Bookmark.book_id=Books.Id WHERE user_id = ?"

	rows, err := db.Query(sqlString, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allBookmarks []qualifiedBookmark
	for rows.Next() {
		bookmark := &qualifiedBookmark{}
		err := rows.Scan(&bookmark.ShelfID, &bookmark.book.ID, &bookmark.CurrentPage, &bookmark.Title, &bookmark.Author, &bookmark.PageCount)
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

func queryBookmarkByBookIdAndUserId(db *sql.DB, bookId string, userID string) (*bookmark, error) {
	sqlString := "SELECT book_id, current_page FROM bookmark WHERE book_id = ? AND user_id = ?"
	row := db.QueryRow(sqlString, bookId, userID)
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
	existingBookmark, err := queryBookmarkByBookIdAndUserId(db, bm.BookID, bm.UserID)

	if err != nil {
		return err
	}

	if existingBookmark == nil {
		sqlString := "INSERT INTO bookmark (user_id, shelf_id, book_id, current_page) VALUES (?, ?, ?, ?);"

		_, err := db.Exec(sqlString, bm.UserID, bm.ShelfID, bm.BookID, bm.CurrentPage)
		return err
	}

	sqlString := `UPDATE bookmark SET shelf_id = ?, current_page = ?WHERE book_id = ? AND user_id = ?;`
	_, err = db.Exec(sqlString, bm.ShelfID, bm.CurrentPage, bm.BookID, bm.UserID)
	return err
}
