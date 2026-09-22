package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

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
