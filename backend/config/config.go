package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	JwtSecret   []byte
	Port        string
	DatabaseURL string
}

func LoadConfig() (Config, error) {
	_ = godotenv.Load()

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{JwtSecret: []byte(jwtSecret), Port: port, DatabaseURL: databaseURL}, nil
}
