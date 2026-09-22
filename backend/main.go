package main

import (
	"net/http"

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

	router.Run("localhost:8080")
}

func getBooksHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sqlString := "SELECT Id, Title, Author, PageCount FROM Books"

		rows, err := db.Query(sqlString)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		defer rows.Close()

		var books []book
		for rows.Next() {
			b := &book{}
			err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			books = append(books, *b)
		}

		if err = rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}

		c.JSON(http.StatusOK, books)
	}
}

func getReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sqlString := "SELECT ReadingProgress.BookId, ReadingProgress.CurrentPage, Books.Title, Books.Author, Books.PageCount FROM ReadingProgress INNER JOIN Books ON ReadingProgress.BookId=Books.Id"

		rows, err := db.Query(sqlString)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		defer rows.Close()

		var allReadingProgress []qualifiedReadingProgress
		for rows.Next() {
			readingProgress := &qualifiedReadingProgress{}
			err := rows.Scan(&readingProgress.book.ID, &readingProgress.CurrentPage, &readingProgress.Title, &readingProgress.Author, &readingProgress.PageCount)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			allReadingProgress = append(allReadingProgress, *readingProgress)
		}

		if err = rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}

		c.JSON(http.StatusOK, allReadingProgress)
	}
}

func postReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var readingProgress readingProgress

		if err := c.ShouldBindJSON(&readingProgress); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := getBookById(db, readingProgress.BookID)

		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		err = upsertReadingProgress(db, &readingProgress)

		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedReadingProgress := qualifiedReadingProgress{book: *book, CurrentPage: readingProgress.CurrentPage}
		c.JSON(http.StatusOK, updatedReadingProgress)

	}
}

func getBookById(db *sql.DB, id string) (*book, error) {
	sqlString := "SELECT * FROM Books WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &book{}
	err := row.Scan(&b.ID, &b.Title, &b.Author, &b.PageCount)
	if err == nil {
		return b, nil
	}
	return &book{}, err
}

func upsertReadingProgress(db *sql.DB, rp *readingProgress) error {
	existingRp, err := getReadingProgressByBookId(db, rp.BookID)

	if err != nil {
		return err
	}

	if existingRp == nil {
		sqlString := "INSERT INTO ReadingProgress (BookId, CurrentPage) VALUES (?, ?);"

		_, err := db.Exec(sqlString, rp.BookID, rp.CurrentPage)
		return err
	}

	sqlString := `UPDATE ReadingProgress SET CurrentPage = ? WHERE BookId = ?;`
	_, err = db.Exec(sqlString, rp.CurrentPage, rp.BookID)
	return err
}

func getReadingProgressByBookId(db *sql.DB, bookId string) (*readingProgress, error) {
	sqlString := "SELECT * FROM ReadingProgress WHERE BookId = ?"
	row := db.QueryRow(sqlString, bookId)
	rp := &readingProgress{}
	err := row.Scan(&rp.BookID, &rp.CurrentPage)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rp, nil
}
