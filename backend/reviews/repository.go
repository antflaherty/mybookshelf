package reviews

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

// ErrReviewStoreFailed reports that writing a review did not succeed, so the
// caller can tell a storage failure from a missing book.
var ErrReviewStoreFailed = errors.New("review store failed")

func upsertReview(db *sql.DB, userID string, bookID string, stars int, timestamp string, comment *string) (*domain.Review, error) {
	existingReview, err := queryReviewByBookIDAndUserID(db, bookID, userID)

	if err != nil {
		return nil, err
	}

	if existingReview == nil {
		sqlString := "INSERT INTO review (user_id, book_id, stars, created_timestamp, comment) VALUES ($1, $2, $3, $4, $5);"

		_, err = db.Exec(sqlString, userID, bookID, stars, timestamp, comment)

		if err != nil {
			return nil, fmt.Errorf("%w: insert: %w", ErrReviewStoreFailed, err)
		}
	}

	// The UPDATE runs even after a fresh INSERT. That is deliberate: it sets
	// last_edited_timestamp on create. Do not "fix" it into an else branch.
	sqlString := `UPDATE review SET stars = $1, comment = $2, last_edited_timestamp = $3 WHERE book_id = $4 AND user_id = $5;`
	_, err = db.Exec(sqlString, stars, comment, timestamp, bookID, userID)

	if err != nil {
		return nil, fmt.Errorf("%w: update: %w", ErrReviewStoreFailed, err)
	}
	return queryReviewByBookIDAndUserID(db, bookID, userID)

}

func queryReviewByBookIDAndUserID(db *sql.DB, bookID string, userID string) (*domain.Review, error) {
	sqlString := "SELECT book_id, user_id, stars, comment, created_timestamp, last_edited_timestamp FROM review WHERE book_id = $1 AND user_id = $2"
	row := db.QueryRow(sqlString, bookID, userID)
	review := &domain.Review{}
	err := row.Scan(&review.BookID, &review.UserID, &review.Stars, &review.Comment, &review.CreatedTimestamp, &review.LastEditedTimestamp)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return review, nil
}

func queryReviewsByBookID(db *sql.DB, bookID string) ([]domain.Review, error) {
	sqlString := "SELECT book_id, user_id, stars, comment, created_timestamp, last_edited_timestamp FROM review WHERE book_id = $1"
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
