package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getShelvesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allShelves, err := queryAllShelves(db, c.GetString("userID"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, allShelves)
	}
}
