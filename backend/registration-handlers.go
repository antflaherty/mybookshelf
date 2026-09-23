package main

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func registerHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request registerRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		fmt.Println(request.Password)

		passwordHash, err := bcrypt.GenerateFromPassword(
			[]byte(request.Password),
			bcrypt.DefaultCost,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		user := &User{Email: request.Email, PasswordHash: string(passwordHash)}

		user, err = createUser(db, user)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to create user",
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
		})
	}
}

func createUser(db *sql.DB, user *User) (*User, error) {
	user.ID = uuid.NewString()

	_, err := db.Exec(
		`INSERT INTO users (id, email, password_hash)
			 VALUES (?, ?, ?)`,
		user.ID,
		user.Email,
		user.PasswordHash,
	)

	if err != nil {
		return nil, err
	}

	return user, nil
}
