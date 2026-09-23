package main

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/auth"
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

func loginHandler(config config, db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request registerRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user, err := queryUserByEmail(db, request.Email)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid email or password",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		err = bcrypt.CompareHashAndPassword(
			[]byte(user.PasswordHash),
			[]byte(request.Password),
		)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}

		jwt, err := auth.CreateAccessToken(user.ID, config.jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"access_token": jwt,
			"token_type": "Bearer"})
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

func queryUserByEmail(db *sql.DB, email string) (*User, error) {
	sqlString := "SELECT id, password_hash FROM users WHERE email = ?"
	row := db.QueryRow(sqlString, email)
	user := &User{}
	err := row.Scan(&user.ID, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return user, nil
}
