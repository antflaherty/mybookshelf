package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allBookmark, err := queryAllBookmarks(db, c.GetString("userID"))
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

func postBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postBookmarkRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := queryBookById(db, request.BookID)

		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		userID := c.GetString("userID")
		bookmark := &bookmark{UserID: userID, BookID: request.BookID, ShelfID: request.ShelfID, CurrentPage: request.CurrentPage}

		err = upsertBookmark(db, bookmark)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedBookmark := qualifiedBookmark{book: *book, CurrentPage: bookmark.CurrentPage}
		c.JSON(http.StatusOK, updatedBookmark)
	}
}
