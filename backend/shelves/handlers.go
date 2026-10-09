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

func GetShelvesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		allShelves, err := queryAllShelves(db, userID)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		allBookmarks, err := bookmarks.QueryAllBookmarks(db, userID)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		shelfById := make(map[string]*domain.Shelf, len(*allShelves))

		for i := range *allShelves {
			shelf := &(*allShelves)[i]
			shelf.Bookmarks = []domain.QualifiedBookmark{}
			shelfById[shelf.ID] = shelf
		}

		for _, bookmark := range *allBookmarks {
			shelf, ok := shelfById[bookmark.ShelfID]
			if !ok {
				// The bookmark points at a shelf this user does not have: a
				// shelf deleted straight in the database, or one left behind by
				// an older bug. Dropping it is better than a nil dereference
				// that takes down the whole shelf list.
				slog.Warn("bookmark references a shelf missing from the user's shelves",
					"shelfId", bookmark.ShelfID,
					"bookId", bookmark.Book.ID,
					"userId", userID,
				)
				continue
			}

			shelf.Bookmarks = append(shelf.Bookmarks, bookmark)
		}

		c.JSON(http.StatusOK, allShelves)
	}
}
