package books

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
)

// Fake implementations of the provider interfaces.
// No mock framework needed — just structs with canned behavior.
type fakeSearchProvider struct {
	books []domain.Book
	err   error
}

func (f fakeSearchProvider) SearchBooksByTitle(title string, limit int, page int) ([]domain.Book, error) {
	return f.books, f.err
}

type fakeDetailsProvider struct {
	details *BookDetails
	err     error
}

func (f fakeDetailsProvider) GetBookDetails(bookId string) (*BookDetails, error) {
	return f.details, f.err
}

func setupBooksRouter(search BookSearchProvider, details BookDetailsProvider) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/books", GetBooksHandler(search, details))
	return r
}

func performBooksRequest(r *gin.Engine, query string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/books?"+query, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func decodeErrorBody(t *testing.T, w *httptest.ResponseRecorder) struct {
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

func TestGetBooks(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		search     BookSearchProvider
		details    BookDetailsProvider
		wantStatus int
		wantCode   string
	}{
		{
			name:       "both title and id is a bad request",
			query:      "title=foo&id=bar",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "neither title nor id is a bad request",
			query:      "",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "non-integer limit is a bad request",
			query:      "title=foo&limit=abc&page=1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "non-integer page is a bad request",
			query:      "title=foo&limit=1&page=abc",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "limit below range is a bad request",
			query:      "title=dune&limit=0&page=1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "limit above range is a bad request",
			query:      "title=dune&limit=101&page=1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "page below range is a bad request",
			query:      "title=dune&limit=1&page=0",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_request",
		},
		{
			name:       "smallest valid limit is accepted",
			query:      "title=dune&limit=1&page=1",
			search:     fakeSearchProvider{books: []domain.Book{{ID: "/works/OL1", Title: "Dune"}}},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusOK,
		},
		{
			name:       "search returns results",
			query:      "title=dune&limit=1&page=1",
			search:     fakeSearchProvider{books: []domain.Book{{ID: "/works/OL1", Title: "Dune"}}},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusOK,
		},
		{
			name:       "search provider error returns 500",
			query:      "title=dune&limit=1&page=1",
			search:     fakeSearchProvider{err: errors.New("openlibrary down")},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
		{
			name:       "search upstream error returns 502",
			query:      "title=dune&limit=1&page=1",
			search:     fakeSearchProvider{err: fmt.Errorf("%w: dialing", ErrUpstream)},
			details:    fakeDetailsProvider{},
			wantStatus: http.StatusBadGateway,
			wantCode:   "upstream_unavailable",
		},
		{
			name:       "details returns a book",
			query:      "id=/works/OL1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{details: &BookDetails{ID: "/works/OL1", Blurb: "desert"}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "details not found returns 404",
			query:      "id=/works/OL999",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{err: fmt.Errorf("%w: /works/OL999", ErrBookNotFound)},
			wantStatus: http.StatusNotFound,
			wantCode:   "book_not_found",
		},
		{
			name:       "details upstream error returns 502",
			query:      "id=/works/OL1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{err: fmt.Errorf("%w: timeout", ErrUpstream)},
			wantStatus: http.StatusBadGateway,
			wantCode:   "upstream_unavailable",
		},
		{
			name:       "details provider error returns 500",
			query:      "id=/works/OL999",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{err: errors.New("book not found")},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupBooksRouter(tt.search, tt.details)
			w := performBooksRequest(r, tt.query)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d (body %s)", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantCode != "" {
				if got := decodeErrorBody(t, w).Code; got != tt.wantCode {
					t.Errorf("expected code %q, got %q", tt.wantCode, got)
				}
			}
		})
	}
}

func TestGetBooks_ErrorMessagesDoNotLeakInternals(t *testing.T) {
	leaky := errors.New(`pq: connection refused {"detail":"secret host"}`)

	r := setupBooksRouter(
		fakeSearchProvider{err: leaky},
		fakeDetailsProvider{err: leaky},
	)

	for _, query := range []string{"title=dune&limit=1&page=1", "id=/works/OL1"} {
		w := performBooksRequest(r, query)

		if got := w.Body.String(); strings.Contains(got, "pq:") || strings.Contains(got, "secret host") {
			t.Errorf("internal error text leaked to client for %q: %s", query, got)
		}
	}
}
