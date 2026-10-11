package main

import (
	"github.com/antflaherty/mybookshelf/backend/apierr"
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
	// Each of these used to print and return, exiting with status 0: a missing
	// JWT_SECRET or a refused database connection read in CI like a passing
	// run. Same bug the router.Run error below had.
	config, err := config.LoadConfig()
	if err != nil {
		slog.Error("config load failed", "error", err)
		os.Exit(1)
	}

	db, err := sql.Open("postgres", config.DatabaseURL)
	if err != nil {
		slog.Error("opening database failed", "error", err)
		os.Exit(1)
	}

	if err := db.Ping(); err != nil {
		slog.Error("database unreachable", "error", err)
		os.Exit(1)
	}

	defer db.Close()

	router := newRouter(config, db)

	// Discarding this error made a port conflict exit with status 0 and no
	// message, which reads in CI like a passing run.
	address := "0.0.0.0:" + config.Port

	if err := router.Run(address); err != nil {
		slog.Error("server stopped", "address", address, "error", err)
		os.Exit(1)
	}
}

// newRouter builds the complete route table. It is separate from main so the
// framework-level handlers below can be tested without a database or a port.
func newRouter(config config.Config, db *sql.DB) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())

	// gin's defaults answer unknown routes with a plain-text 404 and panics
	// with an empty-body 500. Both bypass apierr, which owns every non-2xx
	// response body, so the framework's own responses are pinned to the
	// envelope here.
	router.NoRoute(func(c *gin.Context) {
		apierr.Respond(c, apierr.NotFound(c.Request.URL.Path))
	})

	router.Use(gin.CustomRecovery(func(c *gin.Context, recovered any) {
		// The panic value goes to the logs as the internal cause; the client
		// keeps the fixed internal_error message and never sees the panic text.
		apierr.Respond(c, apierr.Internal(fmt.Errorf("panic: %v", recovered)))
	}))

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

	return router
}
