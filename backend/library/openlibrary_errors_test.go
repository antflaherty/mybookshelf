package library

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// testService points the service at a test server instead of openlibrary.org.
func testService(t *testing.T, server *httptest.Server, timeout time.Duration) OpenLibrarySearchService {
	t.Helper()

	return OpenLibrarySearchService{
		client:    &http.Client{Timeout: timeout},
		baseUrl:   server.URL,
		coversUrl: server.URL + "/b/id/",
	}
}

func TestGet_NotFoundIsBookNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, err := testService(t, server, time.Second).get(server.URL + "/works/OL1M.json")

	if !errors.Is(err, ErrBookNotFound) {
		t.Errorf("expected ErrBookNotFound, got %v", err)
	}
}

func TestGet_ServerErrorIsUpstream(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	_, err := testService(t, server, time.Second).get(server.URL + "/search.json")

	if !errors.Is(err, ErrUpstream) {
		t.Errorf("expected ErrUpstream, got %v", err)
	}
}

func TestSearchBooks_UnparseableJSONIsUpstream(t *testing.T) {
	// A 200 with garbage in it is still an upstream fault, not a client error.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("this is not json"))
	}))
	defer server.Close()

	_, err := testService(t, server, time.Second).SearchBooksByTitle("dune", 1, 1)

	if !errors.Is(err, ErrUpstream) {
		t.Errorf("expected ErrUpstream, got %v", err)
	}
}

func TestGet_TimeoutIsUpstream(t *testing.T) {
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release
	}))
	defer func() {
		close(release)
		server.Close()
	}()

	_, err := testService(t, server, 50*time.Millisecond).get(server.URL + "/search.json")

	if !errors.Is(err, ErrUpstream) {
		t.Errorf("expected ErrUpstream on timeout, got %v", err)
	}
}

func TestGetBookDetails_UnknownWorkIsBookNotFound(t *testing.T) {
	// The works fetch 404s, which is how Open Library reports an unknown id.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, err := testService(t, server, time.Second).GetBookDetails("/works/OL999")

	if !errors.Is(err, ErrBookNotFound) {
		t.Errorf("expected ErrBookNotFound, got %v", err)
	}
}

func TestGetBookDetails_EmptySearchIsBookNotFound(t *testing.T) {
	// Works and genre lookups succeed, but the search returns no rows. That
	// used to return a bare errors.New and surface as a 500.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/search.json" {
			w.Write([]byte(`{"docs": []}`))
			return
		}
		w.Write([]byte(`{"description": "a book"}`))
	}))
	defer server.Close()

	_, err := testService(t, server, time.Second).GetBookDetails("/works/OL1M")

	if !errors.Is(err, ErrBookNotFound) {
		t.Errorf("expected ErrBookNotFound, got %v", err)
	}
}

func TestGetBookDetails_FailedGenreLookupDoesNotFailRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/search.json":
			w.Write([]byte(`{"docs": [{"key": "/works/OL1M", "title": "Dune"}]}`))
		case r.URL.Path == "/subjects/sf.json":
			// The genre lookup breaks; the book should still come back.
			w.WriteHeader(http.StatusInternalServerError)
		default:
			w.Write([]byte(`{"description": "desert planet", "genres": ["sf"]}`))
		}
	}))
	defer server.Close()

	details, err := testService(t, server, time.Second).GetBookDetails("/works/OL1M")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if details.Book.Title != "Dune" {
		t.Errorf("unexpected title %q", details.Book.Title)
	}

	if len(details.Genres) != 1 || details.Genres[0] != "" {
		t.Errorf("expected the failed genre to be blank, got %v", details.Genres)
	}
}
