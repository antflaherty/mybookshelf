package apierr

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func testRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	return r
}

func respondTo(r *gin.Engine, handler gin.HandlerFunc) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/thing", nil)
	w := httptest.NewRecorder()
	r.GET("/thing", handler)
	r.ServeHTTP(w, req)
	return w
}

func decodeBody(t *testing.T, w *httptest.ResponseRecorder) Body {
	t.Helper()
	var body Body
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode response %q: %v", w.Body.String(), err)
	}
	return body
}

func TestRespond_UsesStatusFromWrappedError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantCode int
		wantMsg  string
	}{
		{
			name:     "invalid request keeps its 400",
			err:      InvalidRequest(map[string]string{"page": "must be at least 1"}),
			wantCode: http.StatusBadRequest,
			wantMsg:  "invalid request",
		},
		{
			name:     "book not found keeps its 404",
			err:      BookNotFound("/works/OL1M"),
			wantCode: http.StatusNotFound,
			wantMsg:  "not found",
		},
		{
			name:     "email taken keeps its 409",
			err:      EmailTaken(),
			wantCode: http.StatusConflict,
			wantMsg:  "email already registered",
		},
		{
			name:     "internal keeps its 500",
			err:      Internal(errors.New("pq: relation does not exist")),
			wantCode: http.StatusInternalServerError,
			wantMsg:  "internal server error",
		},
		{
			name:     "upstream keeps its 502",
			err:      Upstream(errors.New("dial tcp: timeout")),
			wantCode: http.StatusBadGateway,
			wantMsg:  "book service unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := respondTo(testRouter(), func(c *gin.Context) {
				Respond(c, tt.err)
			})

			if w.Code != tt.wantCode {
				t.Errorf("expected status %d, got %d", tt.wantCode, w.Code)
			}

			body := decodeBody(t, w)

			if body.Error.Message != tt.wantMsg {
				t.Errorf("expected message %q, got %q", tt.wantMsg, body.Error.Message)
			}
		})
	}
}

func TestRespond_ArbitraryErrorIsInternal(t *testing.T) {
	leaky := errors.New("pq: duplicate key value violates unique constraint \"users_email_key\"")

	w := respondTo(testRouter(), func(c *gin.Context) {
		Respond(c, leaky)
	})

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	body := decodeBody(t, w)

	if body.Error.Code != CodeInternal {
		t.Errorf("expected code %q, got %q", CodeInternal, body.Error.Code)
	}

	if body.Error.Message != MessageInternal {
		t.Errorf("expected fixed message %q, got %q", MessageInternal, body.Error.Message)
	}

	if strings.Contains(w.Body.String(), "duplicate key value") {
		t.Errorf("internal error text leaked to client: %s", w.Body.String())
	}
}

func TestRespond_WrappedErrorIsUnwrapped(t *testing.T) {
	// A handler that adds context with %w must still produce the 404, not a 500.
	wrapped := fmt.Errorf("looking up details: %w", BookNotFound("/works/OL999"))

	w := respondTo(testRouter(), func(c *gin.Context) {
		Respond(c, wrapped)
	})

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestFixedMessagesCannotBeOverridden(t *testing.T) {
	// Internal and Upstream take only a cause, so there is no way to set a
	// different message. This test pins that behaviour.
	internal := Internal(errors.New("boom"))
	if internal.Message != MessageInternal {
		t.Errorf("Internal message must be %q, got %q", MessageInternal, internal.Message)
	}

	upstream := Upstream(errors.New("boom"))
	if upstream.Message != MessageUpstream {
		t.Errorf("Upstream message must be %q, got %q", MessageUpstream, upstream.Message)
	}

	if internal.Error() != MessageInternal {
		t.Errorf("Error() must return the message, got %q", internal.Error())
	}

	if upstream.Unwrap() == nil {
		t.Error("expected Unwrap to expose the cause for logging")
	}
}

func TestRespond_AbortsContext(t *testing.T) {
	// A handler that forgets to return must still not fall through to the
	// response writer a second time.
	r := testRouter()
	r.GET("/thing", func(c *gin.Context) {
		Respond(c, InvalidRequest(nil))
		c.JSON(http.StatusOK, gin.H{"leaked": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/thing", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected the abort to win with status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if strings.Contains(w.Body.String(), "leaked") {
		t.Errorf("handler ran past Respond: %s", w.Body.String())
	}
}

func TestDetailsOmittedWhenAbsent(t *testing.T) {
	w := respondTo(testRouter(), func(c *gin.Context) {
		Respond(c, Internal(errors.New("boom")))
	})

	if strings.Contains(w.Body.String(), "details") {
		t.Errorf("details must be omitted when empty: %s", w.Body.String())
	}
}

func TestDetailsPresentOnInvalidRequest(t *testing.T) {
	w := respondTo(testRouter(), func(c *gin.Context) {
		Respond(c, InvalidRequest(map[string]string{"limit": "must be between 1 and 100"}))
	})

	body := decodeBody(t, w)

	if body.Error.Details["limit"] != "must be between 1 and 100" {
		t.Errorf("unexpected details: %v", body.Error.Details)
	}
}
