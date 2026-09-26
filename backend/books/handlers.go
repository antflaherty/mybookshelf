package books

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/antflaherty/mybookshelf/backend/library"
	"github.com/gin-gonic/gin"
)

func GetBooksHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		title := c.Query("title")

		books, err := library.SearchBooksByTitle(title)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, books)
	}
}

func PostBookHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var book domain.Book

		if err := c.ShouldBindJSON(&book); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fmt.Println(book)

		bookInDb, err := QueryBookById(db, book.ID)
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
