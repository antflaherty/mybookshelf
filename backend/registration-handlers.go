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
				"error": err.Error(),
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

	err = createDefaultShelvesForUser(db, user.ID)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func createDefaultShelvesForUser(db *sql.DB, userID string) error {
	defaultShelves := []shelf{
		{ID: uuid.NewString(), SortOrder: 0, UserID: userID, Name: "to be read"},
		{ID: uuid.NewString(), SortOrder: 1, UserID: userID, Name: "currently reading"},
		{ID: uuid.NewString(), SortOrder: 2, UserID: userID, Name: "finished"},
	}

	transaction, err := db.Begin()
	if err != nil {
		return err
	}
	defer transaction.Rollback()

	stmt, err := transaction.Prepare(`
		INSERT INTO shelf (id, sort_order, user_id, name)
		VALUES (?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, shelf := range defaultShelves {
		_, err := stmt.Exec(
			shelf.ID, shelf.SortOrder, shelf.UserID, shelf.Name,
		)
		if err != nil {
			return err
		}
	}

	return transaction.Commit()
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
