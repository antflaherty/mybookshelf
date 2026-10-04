package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifyAccessToken_ValidToken(t *testing.T) {
	secret := []byte("test-secret")

	token, err := createAccessToken("user-123", secret)
	if err != nil {
		t.Fatalf("createAccessToken failed: %v", err)
	}

	userID, err := verifyAccessToken(token, secret)
	if err != nil {
		t.Fatalf("verifyAccessToken failed: %v", err)
	}

	if userID != "user-123" {
		t.Errorf("expected userID %q, got %q", "user-123", userID)
	}
}

func TestVerifyAccessToken_WrongSecret(t *testing.T) {
	token, err := createAccessToken("user-123", []byte("secret-a"))
	if err != nil {
		t.Fatalf("createAccessToken failed: %v", err)
	}

	_, err = verifyAccessToken(token, []byte("secret-b"))
	if err == nil {
		t.Fatal("expected error for wrong secret, got nil")
	}
}

func TestVerifyAccessToken_ExpiredToken(t *testing.T) {
	secret := []byte("test-secret")

	claims := jwt.MapClaims{
		"sub": "user-123",
		"iat": time.Now().Add(-48 * time.Hour).Unix(),
		"exp": time.Now().Add(-24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secret)
	if err != nil {
		t.Fatalf("signing token failed: %v", err)
	}

	_, err = verifyAccessToken(tokenString, secret)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestVerifyAccessToken_GarbageToken(t *testing.T) {
	_, err := verifyAccessToken("not-a-token", []byte("test-secret"))
	if err == nil {
		t.Fatal("expected error for garbage token, got nil")
	}
}
