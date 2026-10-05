package health

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetHealth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/health", GetHealthHandler())

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}
	if body := w.Body.String(); body != `{"status":"okay"}` {
		t.Errorf("unexpected body %q", body)
	}
}
