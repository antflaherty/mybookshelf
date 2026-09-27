package main

import (
	"github.com/antflaherty/mybookshelf/backend/auth"
	"github.com/antflaherty/mybookshelf/backend/bookmarks"
	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/config"
	"github.com/antflaherty/mybookshelf/backend/library"
	"github.com/antflaherty/mybookshelf/backend/shelves"
	"github.com/gin-gonic/gin"

	"database/sql"
	"fmt"

	_ "github.com/glebarez/go-sqlite"
)

func main() {
	config, err := config.LoadConfig()
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

	router.POST("/auth/register", auth.RegisterHandler(db))
	router.POST("/auth/login", auth.LoginHandler(config, db))

	protected := router.Group("/")
	protected.Use(auth.AuthMiddleware(config.JwtSecret))

	openLibrarySearchService := library.NewOpenLibrarySearchService()

	protected.GET("/books", books.GetBooksHandler(openLibrarySearchService, openLibrarySearchService))
	protected.GET("/bookmarks", bookmarks.GetBookmarkHandler(db))
	protected.GET("/shelves", shelves.GetShelvesHandler(db))

	protected.POST("/books", books.PostBookHandler(db))
	protected.POST("/bookmarks", bookmarks.PostBookmarkHandler(db))

	router.Run("0.0.0.0:8080")
}
