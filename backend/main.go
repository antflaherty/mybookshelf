package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"database/sql"
	"fmt"

	_ "github.com/glebarez/go-sqlite"
)

func main() {
	db, err := sql.Open("sqlite", "./local.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	defer db.Close()

	router := gin.Default()

	router.GET("/books", getBooksHandler(db))
	router.GET("/readingProgress", getReadingProgressHandler(db))

	router.POST("/readingProgress", postReadingProgressHandler(db))

	router.Run("localhost:8080")
}

func getBooksHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		books, err := queryAllBooks(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, books)
	}
}

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
