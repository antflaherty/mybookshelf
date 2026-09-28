package reviews

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetReviewsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookID := c.Query("bookId")
		if bookID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "must specify bookId"})
			return
		}

		reviews, err := queryReviewsByBookID(db, bookID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, reviews)
	}
}

type postReviewRequest struct {
	BookID    string  `json:"bookId"`
	Stars     int     `json:"stars"`
	TimeStamp string  `json:"timestamp"`
	Comment   *string `json:"comment"`
}

func PostReviewHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postReviewRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := c.GetString("userID")

		review, err := upsertReview(db, userID, request.BookID, request.Stars, request.TimeStamp, request.Comment)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		c.JSON(http.StatusOK, review)
	}
}
