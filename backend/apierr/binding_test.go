package apierr

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

type bindTarget struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Stars    int    `json:"stars" binding:"required,gte=0,lte=20"`
}

func bindRequest(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()

	r := testRouter()
	r.POST("/thing", func(c *gin.Context) {
		var target bindTarget
		if BindJSON(c, &target) != nil {
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodPost, "/thing", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestBindJSON_SyntaxError(t *testing.T) {
	w := bindRequest(t, `{"email": `)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	body := decodeBody(t, w)

	if body.Error.Code != CodeInvalidRequest {
		t.Errorf("expected code %q, got %q", CodeInvalidRequest, body.Error.Code)
	}

	if _, ok := body.Error.Details["body"]; !ok {
		t.Errorf("expected a body detail key, got %v", body.Error.Details)
	}
}

func TestBindJSON_WrongType(t *testing.T) {
	w := bindRequest(t, `{"stars": "twenty"}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	body := decodeBody(t, w)

	if body.Error.Code != CodeInvalidRequest {
		t.Errorf("expected code %q, got %q", CodeInvalidRequest, body.Error.Code)
	}

	if _, ok := body.Error.Details["body"]; !ok {
		t.Errorf("expected a body detail key, got %v", body.Error.Details)
	}
}

func TestBindJSON_ValidatorFailureUsesJSONFieldName(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		wantKey   string
		wantValue string
	}{
		{
			name:    "out of range stars",
			body:    `{"stars": 99}`,
			wantKey: "stars",
		},
		{
			name:    "bad email",
			body:    `{"email": "not-an-email"}`,
			wantKey: "email",
		},
		{
			name:    "short password",
			body:    `{"password": "abc"}`,
			wantKey: "password",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := bindRequest(t, tt.body)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
			}

			body := decodeBody(t, w)

			if body.Error.Code != CodeInvalidRequest {
				t.Errorf("expected code %q, got %q", CodeInvalidRequest, body.Error.Code)
			}

			message, ok := body.Error.Details[tt.wantKey]
			if !ok {
				t.Fatalf("expected a %q detail key, got %v", tt.wantKey, body.Error.Details)
			}

			if strings.Contains(message, "bindTarget") || strings.Contains(message, "Stars") {
				t.Errorf("detail message leaks Go names: %q", message)
			}

			if message == "" {
				t.Error("expected a non-empty detail message")
			}
		})
	}
}

func TestBindJSON_SuccessReturnsNil(t *testing.T) {
	w := bindRequest(t, `{"email": "a@b.com", "password": "hunter2", "stars": 20}`)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusOK, w.Code, w.Body.String())
	}
}
