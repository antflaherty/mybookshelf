package shelves

import (
	"database/sql"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/bookmarks"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

func GetShelvesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		allShelves, err := queryAllShelves(db, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		allBookmarks, err := bookmarks.QueryAllBookmarks(db, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		shelfById := make(map[string]*domain.Shelf, len(*allShelves))

		for i := range *allShelves {
			shelf := &(*allShelves)[i]
			shelf.Bookmarks = []domain.QualifiedBookmark{}
			shelfById[shelf.ID] = shelf
		}

		for _, bookmark := range *allBookmarks {
			shelfById[bookmark.ShelfID].Bookmarks = append(shelfById[bookmark.ShelfID].Bookmarks, bookmark)
		}

		c.JSON(http.StatusOK, allShelves)
	}
}
