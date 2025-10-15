//go:build local
// +build local

package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Simple serverless function for Vercel
	gin.SetMode(gin.ReleaseMode)
	
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"message": "TripFlow API is running",
		})
	})

	// Simple API routes
	api := router.Group("/api")
	{
		api.GET("/schedules", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"schedules": []gin.H{},
				"total": 0,
				"page": 1,
				"limit": 10,
			})
		})
		
		api.GET("/schedules/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"id": c.Param("id"),
				"title": "Sample Schedule",
				"description": "This is a sample schedule",
				"is_public": true,
			})
		})
	}

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Starting TripFlow API server on port %s", port)
	log.Printf("📊 Health check: http://localhost:%s/health", port)
	
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}