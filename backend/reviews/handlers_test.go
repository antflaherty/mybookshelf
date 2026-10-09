package reviews

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
	reviews   []domain.Review
	queryErr  error
	review    *domain.Review
	upsertErr error

	upsertCalls int
	upserted    *reviewCapture
}

// reviewCapture records what the handler asked to store.
type reviewCapture struct {
	UserID string
	BookID string
	Stars  int
}

func (f *fakeStore) queryBook(db *sql.DB, id string) (*domain.Book, error) {
	return f.book, f.bookErr
}

func (f *fakeStore) queryReviewsByBookID(db *sql.DB, bookID string) ([]domain.Review, error) {
	return f.reviews, f.queryErr
}

func (f *fakeStore) upsertReview(db *sql.DB, userID string, bookID string, stars int, timestamp string, comment *string) (*domain.Review, error) {
	f.upsertCalls++
	f.upserted = &reviewCapture{UserID: userID, BookID: bookID, Stars: stars}
	return f.review, f.upsertErr
}

func getRequest(t *testing.T, reviewStore store, query string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-1")
		c.Next()
	})
	r.GET("/reviews", getReviewsHandler(nil, reviewStore))

	req := httptest.NewRequest(http.MethodGet, "/reviews?"+query, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func postRequest(t *testing.T, reviewStore store, body string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("userID", "user-1")
		c.Next()
	})
	r.POST("/reviews", postReviewHandler(nil, reviewStore))

	req := httptest.NewRequest(http.MethodPost, "/reviews", strings.NewReader(body))
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

func TestGetReviewsHandler_MissingBookID(t *testing.T) {
	w := getRequest(t, &fakeStore{}, "")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	body := errorBody(t, w)

	if body.Code != "invalid_request" {
		t.Errorf("expected code invalid_request, got %q", body.Code)
	}

	if _, ok := body.Details["bookId"]; !ok {
		t.Errorf("expected a bookId detail key, got %v", body.Details)
	}
}

func TestGetReviewsHandler_EmptyListIsNotAnError(t *testing.T) {
	// Contract §4: an empty array is a 200, never a 404.
	w := getRequest(t, &fakeStore{reviews: nil}, "bookId=/works/OL1M")

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetReviewsHandler_QueryFailureIsInternal(t *testing.T) {
	w := getRequest(t, &fakeStore{queryErr: errors.New("connection refused")}, "bookId=/works/OL1M")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestPostReviewHandler(t *testing.T) {
	knownBook := func() *fakeStore {
		return &fakeStore{
			book:   &domain.Book{ID: "/works/OL1M"},
			review: &domain.Review{BookID: "/works/OL1M", Stars: 15},
		}
	}

	tests := []struct {
		name       string
		store      *fakeStore
		body       string
		wantStatus int
		wantCode   string
		wantKey    string
		wantWrites int
	}{
		{
			name:       "stars above the scale is a 400",
			store:      knownBook(),
			body:       `{"bookId": "/works/OL1M", "stars": 99}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "stars",
		},
		{
			name:       "negative stars is a 400",
			store:      knownBook(),
			body:       `{"bookId": "/works/OL1M", "stars": -1}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "stars",
		},
		{
			name:       "missing bookId is a 400",
			store:      knownBook(),
			body:       `{"stars": 15}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
			wantKey:    "bookId",
		},
		{
			name:       "malformed json is a 400",
			store:      knownBook(),
			body:       `{"bookId": `,
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "top of the scale is accepted",
			store:      knownBook(),
			body:       `{"bookId": "/works/OL1M", "stars": 20}`,
			wantStatus: http.StatusOK,
			wantWrites: 1,
		},
		{
			name:       "bottom of the scale is accepted",
			store:      knownBook(),
			body:       `{"bookId": "/works/OL1M", "stars": 0}`,
			wantStatus: http.StatusOK,
			wantWrites: 1,
		},
		{
			name: "unknown book is a 404",
			store: &fakeStore{
				bookErr: fmt.Errorf("%w: /works/OL999", books.ErrBookNotFound),
			},
			body:       `{"bookId": "/works/OL999", "stars": 15}`,
			wantStatus: http.StatusNotFound,
			wantCode:   "book_not_found",
		},
		{
			name: "book lookup failure is a 500",
			store: &fakeStore{
				bookErr: errors.New("connection refused"),
			},
			body:       `{"bookId": "/works/OL1M", "stars": 15}`,
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name: "upsert failure is a 500",
			store: &fakeStore{
				book:      &domain.Book{ID: "/works/OL1M"},
				upsertErr: errors.New("deadlock detected"),
			},
			body:       `{"bookId": "/works/OL1M", "stars": 15}`,
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
			wantWrites: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := postRequest(t, tt.store, tt.body)

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

			if tt.store.upsertCalls != tt.wantWrites {
				t.Errorf("expected %d writes, got %d", tt.wantWrites, tt.store.upsertCalls)
			}
		})
	}
}

func TestPostReviewHandler_DoesNotWriteWhenValidationFails(t *testing.T) {
	// The stars range check must run before anything is stored, otherwise a bad
	// rating still hits the database and fails the CHECK constraint.
	store := &fakeStore{book: &domain.Book{ID: "/works/OL1M"}}

	w := postRequest(t, store, `{"bookId": "/works/OL1M", "stars": 99}`)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	if store.upsertCalls != 0 {
		t.Errorf("expected no writes, got %d", store.upsertCalls)
	}
}
