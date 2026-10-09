package auth

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/antflaherty/mybookshelf/backend/config"
	"github.com/antflaherty/mybookshelf/backend/domain"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// pqUniqueViolation is the Postgres SQLSTATE for a unique constraint violation,
// which for registration means the email is already taken.
const pqUniqueViolation = "23505"

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// userStore is the slice of the database the auth handlers use.
//
// *sql.DB cannot be faked without a driver, and the handlers need both Exec
// and QueryRow plus a transaction for the default shelves. This seam lets the
// tests drive every branch with a plain struct. It is deliberately narrow: it
// is the only place the handlers stop talking to *sql.DB directly.
type userStore interface {
	createUser(db *sql.DB, user *User) (*User, error)
	queryUserByEmail(db *sql.DB, email string) (*User, error)
}

// sqlUserStore is the production implementation.
type sqlUserStore struct{}

func (sqlUserStore) createUser(db *sql.DB, user *User) (*User, error) {
	return createUser(db, user)
}

func (sqlUserStore) queryUserByEmail(db *sql.DB, email string) (*User, error) {
	return queryUserByEmail(db, email)
}

func RegisterHandler(db *sql.DB) gin.HandlerFunc {
	return registerHandler(db, sqlUserStore{})
}

func registerHandler(db *sql.DB, store userStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request registerRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword(
			[]byte(request.Password),
			bcrypt.DefaultCost,
		)

		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		user := &User{Email: request.Email, PasswordHash: string(passwordHash)}

		user, err = store.createUser(db, user)

		if err != nil {
			// A taken email is a client mistake, not a server fault. Checking it
			// here means the response does not carry the constraint name.
			var pqErr *pq.Error
			if errors.As(err, &pqErr) && string(pqErr.Code) == pqUniqueViolation {
				apierr.Respond(c, apierr.EmailTaken())
				return
			}

			apierr.Respond(c, apierr.Internal(err))
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
		})
	}
}

func LoginHandler(config config.Config, db *sql.DB) gin.HandlerFunc {
	return loginHandler(config, db, sqlUserStore{})
}

func loginHandler(config config.Config, db *sql.DB, store userStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request registerRequest

		if apierr.BindJSON(c, &request) != nil {
			return
		}

		user, err := store.queryUserByEmail(db, request.Email)

		// Unknown email and wrong password return the identical 401
		// invalid_credentials. They must stay indistinguishable: a client that
		// can tell them apart can enumerate which emails have accounts.
		if errors.Is(err, sql.ErrNoRows) {
			apierr.Respond(c, apierr.InvalidCredentials())
			return
		}

		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
			return
		}

		err = bcrypt.CompareHashAndPassword(
			[]byte(user.PasswordHash),
			[]byte(request.Password),
		)
		if err != nil {
			apierr.Respond(c, apierr.InvalidCredentials())
			return
		}

		jwt, err := createAccessToken(user.ID, config.JwtSecret)
		if err != nil {
			apierr.Respond(c, apierr.Internal(err))
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
			 VALUES ($1, $2, $3)`,
		user.ID,
		user.Email,
		user.PasswordHash,
	)

	if err != nil {
		return nil, err
	}

	// TODO(error-handling): the user row is committed by the Exec above, before
	// the transaction that creates the default shelves. If the shelf insert
	// fails, registration returns 500 but the user already exists, leaving an
	// orphan account with no shelves. Fixing it means moving the user insert
	// into the same transaction, which changes the shape of createUser.
	err = createDefaultShelvesForUser(db, user.ID)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func createDefaultShelvesForUser(db *sql.DB, userID string) error {
	defaultShelves := []domain.Shelf{
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
		VALUES ($1, $2, $3, $4)
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
	sqlString := "SELECT id, password_hash FROM users WHERE email = $1"
	row := db.QueryRow(sqlString, email)
	user := &User{}
	err := row.Scan(&user.ID, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return user, nil
}
