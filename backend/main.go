package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"database/sql"
	"fmt"

	_ "github.com/glebarez/go-sqlite"
)

type bookId struct {
	Id string `json:"id"`
}

type book struct {
	bookId
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type readingProgress struct {
	bookId
	CurrentPage int `json:"currentPage"`
}

type qualifiedReadingProgress struct {
	book
	readingProgress
}

var books = []book{
	{Id: "1", Title: "1984", Author: "George Orwell", PageCount: 100},
	{Id: "2", Title: "Animal Farm", Author: "George Orwell", PageCount: 100},
	{Id: "3", Title: "Small Gods", Author: "Terry Pratchett", PageCount: 325},
	{Id: "4", Title: "Mistbord", Author: "Brandon Sanderson", PageCount: 750},
}

func main() {
	db, err := sql.Open("sqlite", "./local.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	defer db.Close()

	router := gin.Default()

	router.GET("/books", getBooks)
	router.GET("/readingProgress", getReadingProgressHandler(db))

	router.POST("/readingProgress", postReadingProgressHandler(db))

	router.Run("localhost:8080")
}

func getBooks(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, books)
}

func getReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sql := "SELECT ReadingProgress.BookId, ReadingProgress.CurrentPage, Books.Title, Books.Author, Books.PageCount FROM ReadingProgress INNER JOIN Books ON ReadingProgress.BookId=Books.Id"

		rows, err := db.Query(sql)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		defer rows.Close()

		var allReadingProgress []qualifiedReadingProgress
		for rows.Next() {
			readingProgress := &qualifiedReadingProgress{}
			err := rows.Scan(&readingProgress.book.Id, &readingProgress.CurrentPage, &readingProgress.Title, &readingProgress.Author, &readingProgress.PageCount)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			allReadingProgress = append(allReadingProgress, *readingProgress)
		}

		if err = rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}

		c.IndentedJSON(http.StatusOK, allReadingProgress)
	}
}

func postReadingProgressHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var readingProgress readingProgress

		if err := c.ShouldBindJSON(&readingProgress); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		book, err := getBookById(db, readingProgress.Id)

		if err != nil {
			c.IndentedJSON(http.StatusNotFound, err.Error())
			return
		}

		err = upsertReadingProgress(db, &readingProgress)

		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, err.Error())
			return
		}

		updatedReadingProgress := qualifiedReadingProgress{book: *book, CurrentPage: readingProgress.CurrentPage}
		c.IndentedJSON(http.StatusOK, updatedReadingProgress)

	}
}

func getBookById(db *sql.DB, id string) (*book, error) {
	sqlString := "SELECT * FROM Books WHERE Id = ?"
	row := db.QueryRow(sqlString, id)
	b := &book{}
	err := row.Scan(&b.Id, &b.Title, &b.Author, &b.PageCount)
	if err == nil {
		return b, nil
	}
	return &book{}, err
}

func upsertReadingProgress(db *sql.DB, rp *readingProgress) error {
	existingRp, err := getReadingProgressByBookId(db, rp.Id)

	if err != nil {
		return err
	}

	if existingRp == nil {
		sqlString := "INSERT INTO ReadingProgress (BookId, CurrentPage) VALUES (?, ?);"

		_, err := db.Exec(sqlString, rp.Id, rp.CurrentPage)
		return err
	}

	sqlString := `UPDATE ReadingProgress SET CurrentPage = ? WHERE BookId = ?;`
	_, err = db.Exec(sqlString, rp.CurrentPage, rp.Id)
	return err
}

func getReadingProgressByBookId(db *sql.DB, bookId string) (*readingProgress, error) {
	sqlString := "SELECT * FROM ReadingProgress WHERE BookId = ?"
	row := db.QueryRow(sqlString, bookId)
	rp := &readingProgress{}
	err := row.Scan(&rp.Id, &rp.CurrentPage)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rp, nil
}
