package main

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
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

var currentPageByBookId = make(map[string]int)

func main() {
	router := gin.Default()
	router.GET("/books", getBooks)
	router.GET("/books/:title", getBookByTitle)
	router.GET("/readingProgress", getAllReadingProgress)

	router.POST("/readingProgress", postReadingProgress)

	router.Run("localhost:8080")
}

func getBooks(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, books)
}

func getBookByTitle(c *gin.Context) {
	title := c.Param("title")

	for _, book := range books {
		if book.Title == title {
			c.IndentedJSON(http.StatusOK, book)
			return
		}
	}

	c.IndentedJSON(http.StatusNotFound, gin.H{"message": "book not found"})
}

func getAllReadingProgress(c *gin.Context) {
	var allReadingProgress []qualifiedReadingProgress

	for id := range currentPageByBookId {
		book, error := getBookById(id)
		if error != nil {
			c.IndentedJSON(http.StatusNotFound, gin.H{"message": "Book not found with Id."})
			return
		}

		currentPage := currentPageByBookId[id]

		allReadingProgress = append(allReadingProgress, qualifiedReadingProgress{book: book, CurrentPage: currentPage})
	}

	c.IndentedJSON(http.StatusOK, allReadingProgress)
}

func postReadingProgress(c *gin.Context) {
	var readingProgress readingProgress

	if err := c.ShouldBindJSON(&readingProgress); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	book, error := getBookById(readingProgress.Id)
	if error != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{"message": "Book not found with Id."})
		return
	}

	currentPageByBookId[readingProgress.Id] = readingProgress.CurrentPage

	updatedReadingProgress := qualifiedReadingProgress{book: book, CurrentPage: readingProgress.CurrentPage}

	c.IndentedJSON(http.StatusOK, updatedReadingProgress)
}

func getBookById(id string) (book, error) {
	for _, book := range books {
		if id == book.Id {
			return book, nil
		}
	}

	return book{}, errors.New("book not found")
}
