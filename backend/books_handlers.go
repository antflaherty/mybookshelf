package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

type postBookRequest struct {
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

func postBookHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postBookRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		bookID := uuid.NewString()

		book := &book{ID: bookID, Title: request.Title, Author: request.Author, PageCount: request.PageCount}

		err := insertBook(db, book)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		c.JSON(http.StatusOK, book)
	}
}
