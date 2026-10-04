package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetHealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "okay"})
	}
}
