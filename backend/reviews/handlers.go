package reviews

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/gin-gonic/gin"
)

func GetReviewsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookID := c.Query("bookId")
		if bookID == "" {
			apierr.Respond(c, apierr.InvalidRequest(map[string]string{
				"bookId": "bookId is required",
			}))
			return
		}

		reviews, err := queryReviewsByBookID(db, bookID)

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
	Stars     int     `json:"stars" binding:"required,gte=0,lte=20"`
	TimeStamp string  `json:"timestamp"`
	Comment   *string `json:"comment"`
}

func PostReviewHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postReviewRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		// The FK on review.book_id would reject an unknown book, but it does so
		// as a 500. Checking first turns it into the 404 the contract asks for.
		if _, err := books.QueryBookById(db, request.BookID); err != nil {
			if errors.Is(err, books.ErrBookNotFound) {
				apierr.Respond(c, apierr.BookNotFound(request.BookID))
				return
			}

			apierr.Respond(c, apierr.Internal(err))
			return
		}

		userID := c.GetString("userID")

		review, err := upsertReview(db, userID, request.BookID, request.Stars, request.TimeStamp, request.Comment)

		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusOK, review)
	}
}
