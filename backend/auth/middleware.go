package auth

import (
	"strings"

	"github.com/antflaherty/mybookshelf/backend/apierr"
	"github.com/gin-gonic/gin"
)

const UserIDKey = "userID"

func AuthMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")

		if header == "" {
			apierr.Respond(c, apierr.Unauthorized())
			return
		}

		parts := strings.SplitN(header, " ", 2)

		if len(parts) != 2 || parts[0] != "Bearer" {
			apierr.Respond(c, apierr.InvalidAuthorizationHeader())
			return
		}

		tokenString := parts[1]

		userID, err := verifyAccessToken(tokenString, secret)
		if err != nil {
			apierr.Respond(c, apierr.InvalidToken())
			return
		}

		c.Set(UserIDKey, userID)

		c.Next()
	}
}
