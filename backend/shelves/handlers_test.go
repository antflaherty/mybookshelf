package shelves

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

// fakeStore is a plain struct with canned behaviour. No mock library.
type fakeStore struct {
	shelves  *[]domain.Shelf
	shelfErr error

	bookmarks   *[]domain.QualifiedBookmark
	bookmarkErr error
}

func (f *fakeStore) queryAllShelves(db *sql.DB, userID string) (*[]domain.Shelf, error) {
	return f.shelves, f.shelfErr
}

func (f *fakeStore) queryAllBookmarks(db *sql.DB, userID string) (*[]domain.QualifiedBookmark, error) {
	return f.bookmarks, f.bookmarkErr
}

func getShelves(t *testing.T, shelfStore store) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-1")
		c.Next()
	})
	r.GET("/shelves", getShelvesHandler(nil, shelfStore))

	req := httptest.NewRequest(http.MethodGet, "/shelves", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestGetShelvesHandler_OrphanedBookmarkIsSkipped(t *testing.T) {
	// A bookmark can point at a shelf the user does not have: a shelf deleted
	// straight in the database, or one left behind by the missing ownership
	// check. That used to be a nil map dereference and a panic.
	shelves := []domain.Shelf{
		{ID: "shelf-1", Name: "to be read", SortOrder: 0},
		{ID: "shelf-2", Name: "finished", SortOrder: 1},
	}

	bookmarks := []domain.QualifiedBookmark{
		{Book: domain.Book{ID: "/works/OL1M", Title: "Dune"}, Bookmark: domain.Bookmark{ShelfID: "shelf-1", CurrentPage: 10}},
		{Book: domain.Book{ID: "/works/OL9M", Title: "Orphan"}, Bookmark: domain.Bookmark{ShelfID: "shelf-deleted", CurrentPage: 3}},
		{Book: domain.Book{ID: "/works/OL2M", Title: "Emma"}, Bookmark: domain.Bookmark{ShelfID: "shelf-2", CurrentPage: 200}},
	}

	w := getShelves(t, &fakeStore{shelves: &shelves, bookmarks: &bookmarks})

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d (body %s)", http.StatusOK, w.Code, w.Body.String())
	}

	var got []domain.Shelf

	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
	}

	if len(got) != 2 {
		t.Fatalf("expected 2 shelves, got %d", len(got))
	}

	if len(got[0].Bookmarks) != 1 || got[0].Bookmarks[0].Book.ID != "/works/OL1M" {
		t.Errorf("expected shelf-1 to keep its own bookmark, got %+v", got[0].Bookmarks)
	}

	if len(got[1].Bookmarks) != 1 || got[1].Bookmarks[0].Book.ID != "/works/OL2M" {
		t.Errorf("expected shelf-2 to keep its own bookmark, got %+v", got[1].Bookmarks)
	}

	for _, shelf := range got {
		for _, bookmark := range shelf.Bookmarks {
			if bookmark.Book.ID == "/works/OL9M" {
				t.Errorf("orphaned bookmark was not skipped: %+v", shelf)
			}
		}
	}
}

func TestGetShelvesHandler_EmptyCollectionsAre200(t *testing.T) {
	// An empty collection is a 200, not an error.
	empty := []domain.Shelf{}
	noBookmarks := []domain.QualifiedBookmark{}

	w := getShelves(t, &fakeStore{shelves: &empty, bookmarks: &noBookmarks})

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetShelvesHandler_QueryFailuresAreInternal(t *testing.T) {
	tests := []struct {
		name  string
		store *fakeStore
	}{
		{
			name:  "shelf query failure",
			store: &fakeStore{shelfErr: errors.New("connection refused")},
		},
		{
			name: "bookmark query failure",
			store: &fakeStore{
				shelves:     &[]domain.Shelf{{ID: "shelf-1"}},
				bookmarkErr: errors.New("connection refused"),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := getShelves(t, tt.store)

			if w.Code != http.StatusInternalServerError {
				t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
			}

			if got := w.Body.String(); len(got) == 0 || strings.Contains(got, "connection refused") {
				t.Errorf("driver text leaked or body empty: %s", got)
			}
		})
	}
}
