package reviews

import (
	"database/sql"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

func upsertReview(db *sql.DB, userID string, bookID string, stars int, timestamp string, comment *string) (*domain.Review, error) {
	existingReview, err := queryReviewByBookIDAndUserID(db, bookID, userID)

	if err != nil {
		return nil, err
	}

	if existingReview == nil {
		sqlString := "INSERT INTO review (user_id, book_id, stars, created_timestamp, comment) VALUES (?, ?, ?, ?, ?);"

		_, err = db.Exec(sqlString, userID, bookID, stars, timestamp, comment)

		if err != nil {
			return nil, err
		}
	}

	sqlString := `UPDATE review SET stars = ?, comment = ?, last_edited_timestamp = ? WHERE book_id = ? AND user_id = ?;`
	_, err = db.Exec(sqlString, stars, comment, timestamp, bookID, userID)

	if err != nil {
		return nil, err
	}
	return queryReviewByBookIDAndUserID(db, bookID, userID)

}

func queryReviewByBookIDAndUserID(db *sql.DB, bookID string, userID string) (*domain.Review, error) {
	sqlString := "SELECT book_id, user_id, stars, comment, created_timestamp, last_edited_timestamp FROM review WHERE book_id = ? AND user_id = ?"
	row := db.QueryRow(sqlString, bookID, userID)
	review := &domain.Review{}
	err := row.Scan(&review.BookID, &review.UserID, &review.Stars, &review.Comment, &review.CreatedTimestamp, &review.LastEditedTimestamp)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return review, nil
}

func queryReviewsByBookID(db *sql.DB, bookID string) ([]domain.Review, error) {
	sqlString := "SELECT book_id, user_id, stars, comment, created_timestamp, last_edited_timestamp FROM review WHERE book_id = ?"
	rows, err := db.Query(sqlString, bookID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []domain.Review

	for rows.Next() {
		review := &domain.Review{}
		err := rows.Scan(&review.BookID, &review.UserID, &review.Stars, &review.Comment, &review.CreatedTimestamp, &review.LastEditedTimestamp)

		if err != nil {
			return nil, err
		}

		reviews = append(reviews, *review)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reviews, nil
}
