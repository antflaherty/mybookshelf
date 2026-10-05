package config

import (
	"testing"
)

func TestLoadConfig_Success(t *testing.T) {
	t.Setenv("JWT_SECRET", "supersecret")
	t.Setenv("DATABASE_URL", "postgres://localhost/test")
	t.Setenv("PORT", "9090")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if string(cfg.JwtSecret) != "supersecret" {
		t.Errorf("unexpected JwtSecret %q", cfg.JwtSecret)
	}
	if cfg.DatabaseURL != "postgres://localhost/test" {
		t.Errorf("unexpected DatabaseURL %q", cfg.DatabaseURL)
	}
	if cfg.Port != "9090" {
		t.Errorf("unexpected Port %q", cfg.Port)
	}
}

func TestLoadConfig_DefaultPort(t *testing.T) {
	t.Setenv("JWT_SECRET", "supersecret")
	t.Setenv("DATABASE_URL", "postgres://localhost/test")
	t.Setenv("PORT", "")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default port %q, got %q", "8080", cfg.Port)
	}
}

func TestLoadConfig_MissingJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	t.Setenv("DATABASE_URL", "postgres://localhost/test")

	_, err := LoadConfig()
	if err == nil {
		t.Fatal("expected error when JWT_SECRET is missing")
	}
}

func TestLoadConfig_MissingDatabaseURL(t *testing.T) {
	t.Setenv("JWT_SECRET", "supersecret")
	t.Setenv("DATABASE_URL", "")

	_, err := LoadConfig()
	if err == nil {
		t.Fatal("expected error when DATABASE_URL is missing")
	}
}
