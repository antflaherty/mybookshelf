package books

import (
	"errors"
	"net/http"
	"net/http/httptest"
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

func TestGetBooks(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		search     BookSearchProvider
		details    BookDetailsProvider
		wantStatus int
	}{
		{
			name:   "both title and id is a bad request",
			query:  "title=foo&id=bar",
			search: fakeSearchProvider{}, details: fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:   "neither title nor id is a bad request",
			query:  "",
			search: fakeSearchProvider{}, details: fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:   "non-integer limit is a bad request",
			query:  "title=foo&limit=abc&page=1",
			search: fakeSearchProvider{}, details: fakeDetailsProvider{},
			wantStatus: http.StatusBadRequest,
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
		},
		{
			name:       "details returns a book",
			query:      "id=/works/OL1",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{details: &BookDetails{ID: "/works/OL1", Blurb: "desert"}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "details provider error returns 500",
			query:      "id=/works/OL999",
			search:     fakeSearchProvider{},
			details:    fakeDetailsProvider{err: errors.New("book not found")},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupBooksRouter(tt.search, tt.details)
			w := performBooksRequest(r, tt.query)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}
