package bookmarks

import (
	"database/sql"
	"errors"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

func QueryAllBookmarks(db *sql.DB, userID string) (*[]domain.QualifiedBookmark, error) {
	sqlString := "SELECT bookmark.shelf_id, bookmark.book_id, bookmark.current_page, book.title, book.author, book.page_count, book.cover_uri FROM bookmark INNER JOIN book ON bookmark.book_id=book.id WHERE user_id = $1"

	rows, err := db.Query(sqlString, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allBookmarks []domain.QualifiedBookmark
	for rows.Next() {
		bookmark := &domain.QualifiedBookmark{}
		var coverUri sql.NullString
		err := rows.Scan(&bookmark.ShelfID, &bookmark.Book.ID, &bookmark.CurrentPage, &bookmark.Book.Title, &bookmark.Book.Author, &bookmark.Book.PageCount, &coverUri)
		if err != nil {
			return nil, err
		}
		bookmark.Book.CoverUri = coverUri.String

		allBookmarks = append(allBookmarks, *bookmark)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &allBookmarks, nil
}

func queryBookmarkByBookIdAndUserId(db *sql.DB, bookId string, userID string) (*domain.Bookmark, error) {
	sqlString := "SELECT book_id, current_page FROM bookmark WHERE book_id = $1 AND user_id = $2"
	row := db.QueryRow(sqlString, bookId, userID)
	bm := &domain.Bookmark{}
	err := row.Scan(&bm.BookID, &bm.CurrentPage)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return bm, nil
}

func upsertBookmark(db *sql.DB, bm *domain.Bookmark) error {
	existingBookmark, err := queryBookmarkByBookIdAndUserId(db, bm.BookID, bm.UserID)

	if err != nil {
		return err
	}

	if existingBookmark == nil {
		sqlString := "INSERT INTO bookmark (user_id, shelf_id, book_id, current_page) VALUES ($1, $2, $3, $4);"

		_, err := db.Exec(sqlString, bm.UserID, bm.ShelfID, bm.BookID, bm.CurrentPage)
		return err
	}

	sqlString := `UPDATE bookmark SET shelf_id = $1, current_page = $2 WHERE book_id = $3 AND user_id = $4;`
	_, err = db.Exec(sqlString, bm.ShelfID, bm.CurrentPage, bm.BookID, bm.UserID)
	return err
}
