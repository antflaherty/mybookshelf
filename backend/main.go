package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type book struct {
	Id        string `json:"id"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
}

type readingProgress struct {
	book
	CurrentPage int `json:"currentPage"`
}

var books = []book{
	{"1", "1984", "George Orwell", 100},
	{"2", "Animal Farm", "George Orwell", 100},
	{"3", "Small Gods", "Terry Pratchett", 325},
	{"4", "Mistbord", "Brandon Sanderson", 750},
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
	var allReadingProgress []readingProgress

	for id := range currentPageByBookId {
		book, error := getBookById(id)
		if error != nil {
			c.IndentedJSON(http.StatusNotFound, gin.H{"message": "Book not found with Id."})
			return
		}

		currentPage := currentPageByBookId[id]

		allReadingProgress = append(allReadingProgress, readingProgress{book: book, CurrentPage: currentPage})
	}

	c.IndentedJSON(http.StatusOK, allReadingProgress)
}

func postReadingProgress(c *gin.Context) {
	id := c.Query("id")
	currentPageString := c.Query("currentPage")

	currentPage, error := strconv.Atoi(currentPageString)
	if error != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Invalid current page. Must be an integer."})
		return
	}

	book, error := getBookById(id)
	if error != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{"message": "Book not found with Id."})
		return
	}

	currentPageByBookId[id] = currentPage

	updatedReadingProgress := readingProgress{book: book, CurrentPage: currentPage}

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
