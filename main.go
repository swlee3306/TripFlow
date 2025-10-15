package main

import (
	"fmt"
	"net/http"

	"tripflow/internal/config"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize Gin engine
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Start the server on configured port
	port := fmt.Sprintf(":%s", cfg.Port)
	router.Run(port)
}
