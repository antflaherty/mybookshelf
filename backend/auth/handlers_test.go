package auth

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/antflaherty/mybookshelf/backend/config"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// fakeUserStore is a plain struct, no mock library. Each test sets the
// canned result it needs.
type fakeUserStore struct {
	createdUser *User
	createErr   error

	foundUser *User
	queryErr  error

	// createCalls counts how many times a user row was actually written.
	createCalls int
}

func (f *fakeUserStore) createUser(db *sql.DB, user *User) (*User, error) {
	f.createCalls++
	if f.createErr != nil {
		return nil, f.createErr
	}
	return f.createdUser, nil
}

func (f *fakeUserStore) queryUserByEmail(db *sql.DB, email string) (*User, error) {
	return f.foundUser, f.queryErr
}

func errorPayload(t *testing.T, w *httptest.ResponseRecorder) (string, string, map[string]string) {
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

	return body.Error.Code, body.Error.Message, body.Error.Details
}

func postJSON(t *testing.T, handler gin.HandlerFunc, path string, body string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST(path, handler)

	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func uniqueViolation() *pq.Error {
	return &pq.Error{Code: "23505", Constraint: "users_email_key"}
}

func TestRegisterHandler_InvalidRequest(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		wantKey   string
		wantCalls int
	}{
		{
			name:      "missing body",
			body:      ``,
			wantCalls: 0,
		},
		{
			name:      "malformed json",
			body:      `{"email": `,
			wantCalls: 0,
		},
		{
			name:      "missing email",
			body:      `{"password": "hunter2"}`,
			wantKey:   "email",
			wantCalls: 0,
		},
		{
			name:      "bad email",
			body:      `{"email": "not-an-email", "password": "hunter2"}`,
			wantKey:   "email",
			wantCalls: 0,
		},
		{
			name:      "missing password",
			body:      `{"email": "a@b.com"}`,
			wantKey:   "password",
			wantCalls: 0,
		},
		{
			name:      "short password",
			body:      `{"email": "a@b.com", "password": "short"}`,
			wantKey:   "password",
			wantCalls: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeUserStore{}

			w := postJSON(t, registerHandler(nil, store), "/auth/register", tt.body)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected status %d, got %d (body %s)", http.StatusBadRequest, w.Code, w.Body.String())
			}

			code, _, details := errorPayload(t, w)

			if code != "invalid_request" {
				t.Errorf("expected code invalid_request, got %q", code)
			}

			if len(details) == 0 {
				t.Error("invalid_request must always carry details")
			}

			if tt.wantKey != "" {
				if _, ok := details[tt.wantKey]; !ok {
					t.Errorf("expected a %q detail key, got %v", tt.wantKey, details)
				}
			}

			if store.createCalls != tt.wantCalls {
				t.Errorf("expected %d create calls, got %d", tt.wantCalls, store.createCalls)
			}
		})
	}
}

func TestRegisterHandler_DuplicateEmailIsConflict(t *testing.T) {
	store := &fakeUserStore{createErr: uniqueViolation()}

	w := postJSON(t, registerHandler(nil, store), "/auth/register",
		`{"email": "a@b.com", "password": "hunter2"}`)

	if w.Code != http.StatusConflict {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusConflict, w.Code, w.Body.String())
	}

	code, _, _ := errorPayload(t, w)

	if code != "email_taken" {
		t.Errorf("expected code email_taken, got %q", code)
	}

	if strings.Contains(w.Body.String(), "users_email_key") {
		t.Errorf("constraint name leaked to client: %s", w.Body.String())
	}
}

func TestRegisterHandler_OtherStoreFailureIsInternal(t *testing.T) {
	store := &fakeUserStore{createErr: errors.New(`pq: could not connect to server`)}

	w := postJSON(t, registerHandler(nil, store), "/auth/register",
		`{"email": "a@b.com", "password": "hunter2"}`)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	code, message, _ := errorPayload(t, w)

	if code != "internal_error" {
		t.Errorf("expected code internal_error, got %q", code)
	}

	if message != "internal server error" {
		t.Errorf("expected the fixed internal message, got %q", message)
	}

	if strings.Contains(w.Body.String(), "could not connect") {
		t.Errorf("driver text leaked to client: %s", w.Body.String())
	}
}

func TestRegisterHandler_SuccessIsCreated(t *testing.T) {
	store := &fakeUserStore{createdUser: &User{ID: "user-1", Email: "a@b.com"}}

	w := postJSON(t, registerHandler(nil, store), "/auth/register",
		`{"email": "a@b.com", "password": "hunter2"}`)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusCreated, w.Code, w.Body.String())
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
	}

	if body["id"] != "user-1" || body["email"] != "a@b.com" {
		t.Errorf("unexpected success body: %v", body)
	}
}

func loginConfig() config.Config {
	return config.Config{JwtSecret: []byte("test-secret")}
}

func TestLoginHandler_UnknownEmailAndWrongPasswordAreIndistinguishable(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("could not hash: %v", err)
	}

	tests := []struct {
		name  string
		store *fakeUserStore
		body  string
	}{
		{
			name:  "unknown email",
			store: &fakeUserStore{queryErr: sql.ErrNoRows},
			body:  `{"email": "nobody@b.com", "password": "correct-password"}`,
		},
		{
			name:  "wrong password",
			store: &fakeUserStore{foundUser: &User{ID: "user-1", PasswordHash: string(hash)}},
			body:  `{"email": "a@b.com", "password": "wrong-password"}`,
		},
	}

	var bodies []string

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := postJSON(t, loginHandler(loginConfig(), nil, tt.store), "/auth/login", tt.body)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
			}

			code, _, _ := errorPayload(t, w)

			if code != "invalid_credentials" {
				t.Errorf("expected code invalid_credentials, got %q", code)
			}

			bodies = append(bodies, w.Body.String())
		})
	}

	// The contract requires these two to be byte-identical so the endpoint
	// cannot be used to enumerate accounts.
	if len(bodies) == 2 && bodies[0] != bodies[1] {
		t.Errorf("responses differ and leak which part was wrong:\n%s\n%s", bodies[0], bodies[1])
	}
}

func TestLoginHandler_InvalidRequest(t *testing.T) {
	store := &fakeUserStore{}

	w := postJSON(t, loginHandler(loginConfig(), nil, store), "/auth/login",
		`{"email": "not-an-email", "password": "hunter2"}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	code, _, details := errorPayload(t, w)

	if code != "invalid_request" {
		t.Errorf("expected code invalid_request, got %q", code)
	}

	if _, ok := details["email"]; !ok {
		t.Errorf("expected an email detail key, got %v", details)
	}
}

func TestLoginHandler_QueryFailureIsInternal(t *testing.T) {
	store := &fakeUserStore{queryErr: errors.New("connection reset by peer")}

	w := postJSON(t, loginHandler(loginConfig(), nil, store), "/auth/login",
		`{"email": "a@b.com", "password": "hunter2"}`)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestLoginHandler_SuccessReturnsToken(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("could not hash: %v", err)
	}

	store := &fakeUserStore{foundUser: &User{ID: "user-1", PasswordHash: string(hash)}}

	w := postJSON(t, loginHandler(loginConfig(), nil, store), "/auth/login",
		`{"email": "a@b.com", "password": "correct-password"}`)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d (body %s)", http.StatusOK, w.Code, w.Body.String())
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode body %q: %v", w.Body.String(), err)
	}

	if body["access_token"] == "" {
		t.Errorf("expected an access_token, got %v", body)
	}

	userID, err := verifyAccessToken(body["access_token"], []byte("test-secret"))
	if err != nil {
		t.Fatalf("returned token does not verify: %v", err)
	}

	if userID != "user-1" {
		t.Errorf("expected subject user-1, got %q", userID)
	}
}
