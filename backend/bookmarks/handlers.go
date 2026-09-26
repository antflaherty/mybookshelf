package bookmarks

import (
	"database/sql"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

func GetBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allBookmark, err := QueryAllBookmarks(db, c.GetString("userID"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, allBookmark)
	}
}

type postBookmarkRequest struct {
	BookID      string `json:"bookId"`
	ShelfID     string `json:"shelfId"`
	CurrentPage int    `json:"currentPage"`
}

func PostBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postBookmarkRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := books.QueryBookById(db, request.BookID)

		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		userID := c.GetString("userID")
		bookmark := &domain.Bookmark{UserID: userID, BookID: request.BookID, ShelfID: request.ShelfID, CurrentPage: request.CurrentPage}

		err = upsertBookmark(db, bookmark)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedBookmark := domain.QualifiedBookmark{Book: *book, CurrentPage: bookmark.CurrentPage}
		c.JSON(http.StatusOK, updatedBookmark)
	}
}
