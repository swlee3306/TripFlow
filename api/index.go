package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Global router instance for serverless optimization
var router *gin.Engine

// Handler is the main entry point for Vercel serverless functions
func Handler(w http.ResponseWriter, r *http.Request) {
	// Ensure router is initialized
	if router == nil {
		initRouter()
	}
	
	// Serve the request using Gin router
	router.ServeHTTP(w, r)
}

// initRouter initializes the Gin router and all routes
func initRouter() {
	gin.SetMode(gin.ReleaseMode)
	
	router = gin.New()
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
}

// main function for local testing only
func main() {
	// Initialize router for local testing
	initRouter()

	// Start local server for testing
	log.Println("Starting local server for testing...")
	port := "8080"
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}