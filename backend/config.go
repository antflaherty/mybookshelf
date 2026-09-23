package main

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type config struct {
	jwtSecret []byte
}

func loadConfig() (config, error) {
	_ = godotenv.Load()

	jwtSecret := os.Getenv("JWT_SECRET")

	if jwtSecret == "" {
		return config{}, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	return config{[]byte(jwtSecret)}, nil
}
