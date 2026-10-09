package bookmarks

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/antflaherty/mybookshelf/backend/books"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

// fakeStore is a plain struct with canned behaviour. No mock library.
type fakeStore struct {
	book      *domain.Book
	bookErr   error
	ownsShelf bool
	shelfErr  error
	upsertErr error

	upsertCalls int
	saved       *domain.Bookmark
}

func (f *fakeStore) queryBook(db *sql.DB, id string) (*domain.Book, error) {
	return f.book, f.bookErr
}

func (f *fakeStore) queryShelfBelongsToUser(db *sql.DB, shelfID, userID string) (bool, error) {
	return f.ownsShelf, f.shelfErr
}

func (f *fakeStore) upsertBookmark(db *sql.DB, bm *domain.Bookmark) error {
	f.upsertCalls++
	f.saved = bm
	return f.upsertErr
}

func postBookmark(t *testing.T, bookStore store, body string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-1")
		c.Next()
	})
	r.POST("/bookmarks", postBookmarkHandler(nil, bookStore))

	req := httptest.NewRequest(http.MethodPost, "/bookmarks", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func errorBody(t *testing.T, w *httptest.ResponseRecorder) struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details"`
} {
	t.Helper()

	var body struct {
		Error struct {
			Code    string            `json:"code"`
			Message string            `json:"message"`
			Details map[string]string `json:"details"`
		} `json:"error"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode error body %q: %v", w.Body.String(), err)
	}

	return body.Error
}

func validBody() string {
	return `{"bookId": "/works/OL1M", "shelfId": "shelf-1", "currentPage": 10}`
}

func TestPostBookmarkHandler(t *testing.T) {
	tests := []struct {
		name       string
		store      *fakeStore
		body       string
		wantStatus int
		wantCode   string
		wantKey    string
		wantUpsert bool
	}{
		{
			name:       "unknown book is a 404",
			store:      &fakeStore{bookErr: fmt.Errorf("%w: /works/OL1M", books.ErrBookNotFound)},
			body:       validBody(),
			wantStatus: http.StatusNotFound,
			wantCode:   "book_not_found",
		},
		{
			// Regression test: a database outage was reported as a 404, which
			// tells the client the book does not exist.
			name:       "database failure during book lookup is a 500",
			store:      &fakeStore{bookErr: errors.New("connection refused")},
			body:       validBody(),
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:       "shelf owned by another user is a 404",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: false},
			body:       validBody(),
			wantStatus: http.StatusNotFound,
			wantCode:   "shelf_not_found",
		},
		{
			name:       "missing shelf is also shelf_not_found",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: false},
			body:       `{"bookId": "/works/OL1M", "shelfId": "nonexistent", "currentPage": 1}`,
			wantStatus: http.StatusNotFound,
			wantCode:   "shelf_not_found",
		},
		{
			name:       "shelf lookup failure is a 500",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, shelfErr: errors.New("connection refused")},
			body:       validBody(),
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:       "negative current page is a 400",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: true},
			body:       `{"bookId": "/works/OL1M", "shelfId": "shelf-1", "currentPage": -5}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "currentPage",
		},
		{
			name:       "missing bookId is a 400",
			store:      &fakeStore{},
			body:       `{"shelfId": "shelf-1", "currentPage": 1}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "bookId",
		},
		{
			name:       "missing shelfId is a 400",
			store:      &fakeStore{},
			body:       `{"bookId": "/works/OL1M", "currentPage": 1}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "shelfId",
		},
		{
			name:       "upsert failure is a 500",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: true, upsertErr: errors.New("deadlock detected")},
			body:       validBody(),
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
			wantUpsert: true,
		},
		{
			name:       "success stays 200",
			store:      &fakeStore{book: &domain.Book{ID: "/works/OL1M", Title: "Dune"}, ownsShelf: true},
			body:       validBody(),
			wantStatus: http.StatusOK,
			wantUpsert: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := postBookmark(t, tt.store, tt.body)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d (body %s)", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantCode != "" {
				body := errorBody(t, w)
				if body.Code != tt.wantCode {
					t.Errorf("expected code %q, got %q", tt.wantCode, body.Code)
				}
				if tt.wantKey != "" {
					if _, ok := body.Details[tt.wantKey]; !ok {
						t.Errorf("expected a %q detail key, got %v", tt.wantKey, body.Details)
					}
				}
			}

			wantUpsert := 0
			if tt.wantUpsert {
				wantUpsert = 1
			}

			if tt.store.upsertCalls != wantUpsert {
				t.Errorf("expected %d upsert calls, got %d", wantUpsert, tt.store.upsertCalls)
			}
		})
	}
}

func TestPostBookmarkHandler_SuccessResponseShape(t *testing.T) {
	store := &fakeStore{
		book:      &domain.Book{ID: "/works/OL1M", Title: "Dune", Author: "Herbert", PageCount: 412},
		ownsShelf: true,
	}

	w := postBookmark(t, store, validBody())

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var body struct {
		Book        domain.Book `json:"book"`
		CurrentPage int         `json:"currentPage"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
	}

	if body.Book.Title != "Dune" {
		t.Errorf("unexpected book %+v", body.Book)
	}

	if body.CurrentPage != 10 {
		t.Errorf("expected currentPage 10, got %d", body.CurrentPage)
	}

	// The handler must not leak the caller's identity back to them.
	if strings.Contains(w.Body.String(), "user-1") {
		t.Errorf("user ID leaked into response: %s", w.Body.String())
	}
}

func TestPostBookmarkHandler_ForbiddenShelfIsNotIndistinguishableFromMissing(t *testing.T) {
	// A shelf owned by someone else and a shelf that does not exist must be
	// reported the same way, so the endpoint cannot be used to probe which
	// shelf ids exist. The details key echoes the id the caller supplied, which
	// tells them nothing they did not already know.
	foreign := postBookmark(t, &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: false}, validBody())
	missing := postBookmark(t, &fakeStore{book: &domain.Book{ID: "/works/OL1M"}, ownsShelf: false},
		`{"bookId": "/works/OL1M", "shelfId": "does-not-exist", "currentPage": 10}`)

	if foreign.Code != missing.Code {
		t.Errorf("status differs: %d vs %d", foreign.Code, missing.Code)
	}

	foreignBody := errorBody(t, foreign)
	missingBody := errorBody(t, missing)

	if foreignBody.Code != missingBody.Code {
		t.Errorf("code reveals shelf ownership: %q vs %q", foreignBody.Code, missingBody.Code)
	}

	if foreignBody.Message != missingBody.Message {
		t.Errorf("message reveals shelf ownership: %q vs %q", foreignBody.Message, missingBody.Message)
	}
}
