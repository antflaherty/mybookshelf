package shelves

import (
	"database/sql"
	"log/slog"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/bookmarks"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

// store is the database surface GetShelvesHandler needs.
//
// bookmarks.QueryAllBookmarks lives in another package, so the seam wraps it
// rather than replacing it. This exists so the handler can be tested without a
// live database.
type store interface {
	queryAllShelves(db *sql.DB, userID string) (*[]domain.Shelf, error)
	queryAllBookmarks(db *sql.DB, userID string) (*[]domain.QualifiedBookmark, error)
}

type sqlStore struct{}

func (sqlStore) queryAllShelves(db *sql.DB, userID string) (*[]domain.Shelf, error) {
	return queryAllShelves(db, userID)
}

func (sqlStore) queryAllBookmarks(db *sql.DB, userID string) (*[]domain.QualifiedBookmark, error) {
	return bookmarks.QueryAllBookmarks(db, userID)
}

func GetShelvesHandler(db *sql.DB) gin.HandlerFunc {
	return getShelvesHandler(db, sqlStore{})
}

func getShelvesHandler(db *sql.DB, shelfStore store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		allShelves, err := shelfStore.queryAllShelves(db, userID)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		allBookmarks, err := shelfStore.queryAllBookmarks(db, userID)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		shelfById := make(map[string]*domain.Shelf)

		if allShelves != nil {
			for i := range *allShelves {
				shelf := &(*allShelves)[i]
				shelf.Bookmarks = []domain.QualifiedBookmark{}
				shelfById[shelf.ID] = shelf
			}
		}

		if allBookmarks != nil {
			for _, bookmark := range *allBookmarks {
				shelf, ok := shelfById[bookmark.ShelfID]
				if !ok {
					// The bookmark points at a shelf this user does not have: a
					// shelf deleted straight in the database, or one left behind
					// by the old missing ownership check. Dropping it beats a nil
					// dereference that takes down the whole shelf list.
					slog.Warn("bookmark references a shelf missing from the user's shelves",
						"shelfId", bookmark.ShelfID,
						"bookId", bookmark.Book.ID,
						"userId", userID,
					)
					continue
				}

				shelf.Bookmarks = append(shelf.Bookmarks, bookmark)
			}
		}

		c.JSON(http.StatusOK, allShelves)
	}
}
