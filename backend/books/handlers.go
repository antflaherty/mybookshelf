package books

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

const (
	minLimit = 1
	maxLimit = 100
)

func GetBooksHandler(searchService BookSearchProvider, bookDetailsService BookDetailsProvider) gin.HandlerFunc {
	return func(c *gin.Context) {
		title := c.Query("title")
		id := c.Query("id")

		if (title != "" && id != "") || (title == "" && id == "") {
			apierr.Respond(c, apierr.InvalidRequest(map[string]string{
				"query": "specify exactly one of title or id",
			}))
			return
		}

		if title != "" {
			limit, err := strconv.Atoi(c.Query("limit"))
			if err != nil {
				apierr.Respond(c, apierr.InvalidRequest(map[string]string{
					"limit": "limit must be an integer",
				}))
				return
			}

			if limit < minLimit || limit > maxLimit {
				apierr.Respond(c, apierr.InvalidRequest(map[string]string{
					"limit": fmt.Sprintf("limit must be between %d and %d", minLimit, maxLimit),
				}))
				return
			}

			page, err := strconv.Atoi(c.Query("page"))
			if err != nil {
				apierr.Respond(c, apierr.InvalidRequest(map[string]string{
					"page": "page must be an integer",
				}))
				return
			}

			if page < 1 {
				apierr.Respond(c, apierr.InvalidRequest(map[string]string{
					"page": "page must be 1 or greater",
				}))
				return
			}

			books, err := searchService.SearchBooksByTitle(title, limit, page)

			if err != nil {
				apierr.Respond(c, classifySearchError(err))
				return
			}

			c.JSON(http.StatusOK, books)
			return
		}

		if id != "" {
			bookDetails, err := bookDetailsService.GetBookDetails(id)

			if err != nil {
				apierr.Respond(c, classifyDetailsError(err, id))
				return
			}

			c.JSON(http.StatusOK, bookDetails)
			return
		}
	}
}

// classifySearchError maps a search failure onto a status. The classification
// goes through books' own sentinels rather than library's, because library
// imports this package and the reverse would be an import cycle.
func classifySearchError(err error) *apierr.Error {
	if IsUpstreamError(err) {
		return apierr.Upstream(err)
	}
	return apierr.Internal(err)
}

// classifyDetailsError maps a details failure onto a status. A book Open
// Library does not know about is a 404, not a 500.
func classifyDetailsError(err error, id string) *apierr.Error {
	switch {
	case IsNotFoundError(err):
		return apierr.BookNotFound(id)
	case IsUpstreamError(err):
		return apierr.Upstream(err)
	default:
		return apierr.Internal(err)
	}
}

// postBookRequest exists so binding tags stay in this package. domain.Book is
// shared with the library client and must not carry HTTP validation.
//
// Only id and title are required. pageCount and coverUri are left
// unvalidated because a missing page count and a missing cover are both real
// states for a book, and the columns accept them.
type postBookRequest struct {
	ID        string `json:"id" binding:"required"`
	Title     string `json:"title" binding:"required"`
	Author    string `json:"author"`
	PageCount int    `json:"pageCount"`
	CoverUri  string `json:"coverUri"`
}

func (r postBookRequest) toDomainBook() domain.Book {
	return domain.Book{
		ID:        r.ID,
		Title:     r.Title,
		Author:    r.Author,
		PageCount: r.PageCount,
		CoverUri:  r.CoverUri,
	}
}

func PostBookHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postBookRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		book := request.toDomainBook()

		bookInDb, err := QueryBookById(db, book.ID)

		if err != nil && !errors.Is(err, ErrBookNotFound) {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		// Not-found is the expected path, not an error: it means there is
		// nothing stored yet, so the insert below is what we want.
		if bookInDb != nil {
			c.JSON(http.StatusOK, bookInDb)
			return
		}

		if err := insertBook(db, &book); err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusOK, book)
	}
}
