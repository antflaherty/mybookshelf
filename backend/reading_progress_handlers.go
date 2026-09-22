package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allReadingProgress, err := queryAllReadingProgress(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, allReadingProgress)
	}
}

func postReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var readingProgress readingProgress

		if err := c.ShouldBindJSON(&readingProgress); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := queryBookById(db, readingProgress.BookID)

		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		err = upsertReadingProgress(db, &readingProgress)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedReadingProgress := qualifiedReadingProgress{book: *book, CurrentPage: readingProgress.CurrentPage}
		c.JSON(http.StatusOK, updatedReadingProgress)
	}
}
