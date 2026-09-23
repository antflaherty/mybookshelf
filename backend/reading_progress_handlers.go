package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allBookmark, err := queryAllBookmark(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, allBookmark)
	}
}

func postBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var bookmark bookmark

		if err := c.ShouldBindJSON(&bookmark); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := queryBookById(db, bookmark.BookID)

		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		err = upsertBookmark(db, &bookmark)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedBookmark := qualifiedBookmark{book: *book, CurrentPage: bookmark.CurrentPage}
		c.JSON(http.StatusOK, updatedBookmark)
	}
}
