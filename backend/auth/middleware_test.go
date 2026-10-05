package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// setupRouter builds a minimal gin engine with the middleware and a probe handler
// that reports what the middleware stored in the context.
func setupRouter(secret []byte) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(AuthMiddleware(secret))
	r.GET("/protected", func(c *gin.Context) {
		userID, exists := c.Get(UserIDKey)
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "userID not set"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"userID": userID})
	})
	return r
}

func performRequest(r *gin.Engine, authHeader string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestAuthMiddleware_NoHeader(t *testing.T) {
	r := setupRouter([]byte("test-secret"))
	w := performRequest(r, "")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthMiddleware_MalformedHeader(t *testing.T) {
	r := setupRouter([]byte("test-secret"))
	w := performRequest(r, "token-without-bearer-prefix")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	r := setupRouter([]byte("test-secret"))
	w := performRequest(r, "Bearer garbage")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	secret := []byte("test-secret")
	r := setupRouter(secret)

	token, err := createAccessToken("user-123", secret)
	if err != nil {
		t.Fatalf("createAccessToken failed: %v", err)
	}

	w := performRequest(r, "Bearer "+token)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	if body := w.Body.String(); body != `{"userID":"user-123"}` {
		t.Errorf("unexpected body: %s", body)
	}
}
