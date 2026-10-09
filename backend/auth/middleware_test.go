package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

// expiredToken signs a token whose exp is already in the past.
func expiredToken(t *testing.T, secret []byte) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-123",
		"iat": time.Now().Add(-48 * time.Hour).Unix(),
		"exp": time.Now().Add(-24 * time.Hour).Unix(),
	})

	signed, err := token.SignedString(secret)
	if err != nil {
		t.Fatalf("could not sign expired token: %v", err)
	}

	return signed
}

// The three 401 messages are asserted by frontend tests (contract §3), so they
// are pinned here along with their codes.
func TestAuthMiddleware_Errors(t *testing.T) {
	secret := []byte("test-secret")

	tests := []struct {
		name        string
		authHeader  string
		wantCode    string
		wantMessage string
	}{
		{
			name:        "no header",
			authHeader:  "",
			wantCode:    "unauthorized",
			wantMessage: "authorization header required",
		},
		{
			name:        "no bearer prefix",
			authHeader:  "token-without-bearer-prefix",
			wantCode:    "unauthorized",
			wantMessage: "invalid authorization header",
		},
		{
			name:        "wrong scheme",
			authHeader:  "Basic dXNlcjpwYXNz",
			wantCode:    "unauthorized",
			wantMessage: "invalid authorization header",
		},
		{
			name:        "bearer with empty token",
			authHeader:  "Bearer ",
			wantCode:    "unauthorized",
			wantMessage: "invalid or expired token",
		},
		{
			name:        "garbage token",
			authHeader:  "Bearer garbage",
			wantCode:    "unauthorized",
			wantMessage: "invalid or expired token",
		},
		{
			name:        "token signed with the wrong secret",
			authHeader:  "Bearer " + signWith(t, []byte("wrong-secret"), "user-123"),
			wantCode:    "unauthorized",
			wantMessage: "invalid or expired token",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := performRequest(setupRouter(secret), tt.authHeader)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected status %d, got %d (body %s)", http.StatusUnauthorized, w.Code, w.Body.String())
			}

			var body struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}

			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
			}

			if body.Error.Code != tt.wantCode {
				t.Errorf("expected code %q, got %q", tt.wantCode, body.Error.Code)
			}

			if body.Error.Message != tt.wantMessage {
				t.Errorf("expected message %q, got %q", tt.wantMessage, body.Error.Message)
			}
		})
	}
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	secret := []byte("test-secret")

	w := performRequest(setupRouter(secret), "Bearer "+expiredToken(t, secret))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
	}

	if body.Error.Message != "invalid or expired token" {
		t.Errorf("expected message %q, got %q", "invalid or expired token", body.Error.Message)
	}
}

func signWith(t *testing.T, secret []byte, userID string) string {
	t.Helper()

	token, err := createAccessToken(userID, secret)
	if err != nil {
		t.Fatalf("createAccessToken failed: %v", err)
	}

	return token
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
