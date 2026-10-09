package reviews

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

// store is the database surface these handlers need.
//
// *sql.DB cannot be faked without adding a driver dependency, which this
// package is not allowed to do. The seam is narrow and sqlStore below is the
// production implementation.
type store interface {
	queryBook(db *sql.DB, id string) (*domain.Book, error)
	queryReviewsByBookID(db *sql.DB, bookID string) ([]domain.Review, error)
	upsertReview(db *sql.DB, userID string, bookID string, stars int, timestamp string, comment *string) (*domain.Review, error)
}

type sqlStore struct{}

func (sqlStore) queryBook(db *sql.DB, id string) (*domain.Book, error) {
	return books.QueryBookById(db, id)
}

func (sqlStore) queryReviewsByBookID(db *sql.DB, bookID string) ([]domain.Review, error) {
	return queryReviewsByBookID(db, bookID)
}

func (sqlStore) upsertReview(db *sql.DB, userID string, bookID string, stars int, timestamp string, comment *string) (*domain.Review, error) {
	return upsertReview(db, userID, bookID, stars, timestamp, comment)
}

func GetReviewsHandler(db *sql.DB) gin.HandlerFunc {
	return getReviewsHandler(db, sqlStore{})
}

func getReviewsHandler(db *sql.DB, reviewStore store) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookID := c.Query("bookId")
		if bookID == "" {
			apierr.Respond(c, apierr.InvalidRequest(map[string]string{
				"bookId": "bookId is required",
			}))
			return
		}

		reviews, err := reviewStore.queryReviewsByBookID(db, bookID)

		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusOK, reviews)
	}
}

type postReviewRequest struct {
	BookID string `json:"bookId" binding:"required"`
	// The 0..20 range mirrors CHECK (stars BETWEEN 0 AND 20) and the frontend's
	// quarter-star scale, so an out-of-range rating is a 400 here instead of a
	// constraint violation surfacing as a 500.
	//
	// Note there is deliberately no `required` on Stars: validator's required
	// rejects the zero value, and 0 is a legitimate rating on a scale that runs
	// from 0 to 20.
	Stars     int     `json:"stars" binding:"gte=0,lte=20"`
	TimeStamp string  `json:"timestamp"`
	Comment   *string `json:"comment"`
}

func PostReviewHandler(db *sql.DB) gin.HandlerFunc {
	return postReviewHandler(db, sqlStore{})
}

func postReviewHandler(db *sql.DB, reviewStore store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postReviewRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		// The FK on review.book_id would reject an unknown book, but it does so
		// as a 500. Checking first turns it into the 404 BookNotFound returns.
		if _, err := reviewStore.queryBook(db, request.BookID); err != nil {
			if errors.Is(err, books.ErrBookNotFound) {
				apierr.Respond(c, apierr.BookNotFound(request.BookID))
				return
			}

			apierr.Respond(c, apierr.Internal(err))
			return
		}

		userID := c.GetString("userID")

		review, err := reviewStore.upsertReview(db, userID, request.BookID, request.Stars, request.TimeStamp, request.Comment)

		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusOK, review)
	}
}
