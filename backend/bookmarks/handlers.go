package bookmarks

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

func GetBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		allBookmark, err := QueryAllBookmarks(db, c.GetString("userID"))
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusOK, allBookmark)
	}
}

type postBookmarkRequest struct {
	BookID      string `json:"bookId" binding:"required"`
	ShelfID     string `json:"shelfId" binding:"required"`
	CurrentPage int    `json:"currentPage" binding:"required,gte=0"`
}

func PostBookmarkHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request postBookmarkRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		book, err := books.QueryBookById(db, request.BookID)

		// Only an absent book is a 404. A database that is down is a 500, and
		// reporting it as 404 tells the client the book does not exist.
		if err != nil {
			if errors.Is(err, books.ErrBookNotFound) {
				apierr.Respond(c, apierr.BookNotFound(request.BookID))
				return
			}

			apierr.Respond(c, apierr.Internal(err))
			return
		}

		userID := c.GetString("userID")

		// bookmark.shelf_id has a foreign key to shelf(id), so a shelf owned by
		// another user passes the FK and the bookmark lands on someone else's
		// shelf. Check ownership explicitly. Per contract §2.1 a shelf that does
		// not exist and a shelf the caller does not own are both shelf_not_found,
		// so this does not reveal which shelf ids exist.
		ownsShelf, err := queryShelfBelongsToUser(db, request.ShelfID, userID)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		if !ownsShelf {
			apierr.Respond(c, apierr.ShelfNotFound(request.ShelfID))
			return
		}

		bookmark := &domain.Bookmark{UserID: userID, BookID: request.BookID, ShelfID: request.ShelfID, CurrentPage: request.CurrentPage}

		if err := upsertBookmark(db, bookmark); err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		updatedBookmark := domain.QualifiedBookmark{Book: *book, CurrentPage: bookmark.CurrentPage}
		c.JSON(http.StatusOK, updatedBookmark)
	}
}
