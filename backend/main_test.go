package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/config"
	"github.com/gin-gonic/gin"
)

// newTestRouter builds the real route table. The database is nil because
// these tests only exercise the framework-level handlers, which never touch
// it: unknown paths fall to NoRoute and the panicking route is registered
// here on top of the same middleware chain.
func newTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	return newRouter(config.Config{JwtSecret: []byte("test-secret")}, nil)
}

func performRequest(r *gin.Engine, method, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func decodeError(t *testing.T, w *httptest.ResponseRecorder) apierr.Payload {
	t.Helper()

	var body apierr.Body
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode error body %q: %v", w.Body.String(), err)
	}
	return body.Error
}

func TestFrameworkHandlers_UnknownRouteIsEnvelope404(t *testing.T) {
	// gin's default 404 is plain text, which bypasses the envelope apierr
	// owns for every non-2xx response.
	w := performRequest(newTestRouter(t), http.MethodGet, "/no-such-path")

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusNotFound, w.Code, w.Body.String())
	}

	if got := w.Header().Get("Content-Type"); !strings.Contains(got, "application/json") {
		t.Errorf("expected a JSON content type, got %q", got)
	}

	if code := decodeError(t, w).Code; code != apierr.CodeNotFound {
		t.Errorf("expected code %q, got %q", apierr.CodeNotFound, code)
	}
}

func TestFrameworkHandlers_PanicIsEnvelope500(t *testing.T) {
	// gin's default recovery writes an empty-body 500. The envelope must
	// survive a panic, and the panic text must not reach the client.
	r := newTestRouter(t)
	r.GET("/boom", func(c *gin.Context) {
		panic("secret internal detail")
	})

	w := performRequest(r, http.MethodGet, "/boom")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusInternalServerError, w.Code, w.Body.String())
	}

	payload := decodeError(t, w)

	if payload.Code != apierr.CodeInternal {
		t.Errorf("expected code %q, got %q", apierr.CodeInternal, payload.Code)
	}

	if payload.Message != apierr.MessageInternal {
		t.Errorf("expected the fixed internal message %q, got %q", apierr.MessageInternal, payload.Message)
	}

	if strings.Contains(w.Body.String(), "secret internal detail") {
		t.Errorf("panic text leaked to client: %s", w.Body.String())
	}
}
