package main

import (
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

	router.Run("0.0.0.0:8080")
}
