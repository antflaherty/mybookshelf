package main

import (
	"github.com/antflaherty/mybookshelf/backend/auth"
	"github.com/antflaherty/mybookshelf/backend/bookmarks"
	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/config"
	"github.com/antflaherty/mybookshelf/backend/health"
	"github.com/antflaherty/mybookshelf/backend/library"
	"github.com/antflaherty/mybookshelf/backend/reviews"
	"github.com/antflaherty/mybookshelf/backend/shelves"
	"github.com/gin-gonic/gin"

	"database/sql"
	"fmt"
	"log/slog"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	config, err := config.LoadConfig()
	if err != nil {
		fmt.Println(err)
		return
	}

	db, err := sql.Open("postgres", config.DatabaseURL)
	if err != nil {
		fmt.Println(err)
		return
	}

	if err := db.Ping(); err != nil {
		fmt.Println(err)
		return
	}

	defer db.Close()

	router := gin.Default()

	router.GET("/health", health.GetHealthHandler())

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

	protected.GET("/reviews", reviews.GetReviewsHandler((db)))
	protected.POST("/reviews", reviews.PostReviewHandler((db)))

	// Discarding this error made a port conflict exit with status 0 and no
	// message, which reads in CI like a passing run.
	address := "0.0.0.0:" + config.Port

	if err := router.Run(address); err != nil {
		slog.Error("server stopped", "address", address, "error", err)
		os.Exit(1)
	}
}
