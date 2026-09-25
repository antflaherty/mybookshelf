package main

import (
	"github.com/antflaherty/mybookshelf/backend/auth"
	"github.com/gin-gonic/gin"

	"database/sql"
	"fmt"

	_ "github.com/glebarez/go-sqlite"
)

func main() {
	config, err := loadConfig()
	if err != nil {
		fmt.Println(err)
		return
	}

	db, err := sql.Open("sqlite", "./local.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	defer db.Close()

	router := gin.Default()

	router.POST("/auth/register", registerHandler(db))
	router.POST("/auth/login", loginHandler(config, db))

	protected := router.Group("/")
	protected.Use(auth.AuthMiddleware(config.jwtSecret))

	protected.GET("/books", getBooksHandler())
	protected.GET("/bookmarks", getBookmarkHandler(db))
	protected.GET("/shelves", getShelvesHandler(db))

	protected.POST("/books", postBookHandler(db))
	protected.POST("/bookmarks", postBookmarkHandler(db))

	router.Run("0.0.0.0:8080")
}
