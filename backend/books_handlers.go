package main

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getBooksHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		title := c.Query("title")

		books, err := searchBooksByTitle(title)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, books)
	}
}

func postBookHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var book book

		if err := c.ShouldBindJSON(&book); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fmt.Println(book)

		bookInDb, err := queryBookById(db, book.ID)
		if err != nil && err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}
		fmt.Println(bookInDb)

		if bookInDb != nil {
			c.JSON(http.StatusOK, bookInDb)
			return
		}

		err = insertBook(db, &book)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		c.JSON(http.StatusOK, book)
	}
}
