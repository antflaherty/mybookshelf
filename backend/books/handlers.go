package books

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

func GetBooksHandler(searchService BookSearchProvider, bookDetailsService BookDetailsProvider) gin.HandlerFunc {
	return func(c *gin.Context) {
		title := c.Query("title")
		id := c.Query("id")

		if (title != "" && id != "") || (title == "" && id == "") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "specify exactly one of title or id"})
			return
		}

		if title != "" {
			limit, err := strconv.Atoi(c.Query("limit"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be an integer"})
				return
			}

			page, err := strconv.Atoi(c.Query("page"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "page must be an integer"})
				return
			}

			books, err := searchService.SearchBooksByTitle(title, limit, page)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, books)
			return
		}

		if id != "" {
			bookDetails, err := bookDetailsService.GetBookDetails(id)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, bookDetails)
			return
		}
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
