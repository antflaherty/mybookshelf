package main

import (
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
