package main

import (
	"log"
	"os"

	"tripflow/internal/database"
	"tripflow/internal/handlers"
	"tripflow/internal/middleware"
	"tripflow/internal/repositories"
	"tripflow/pkg/filestorage"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	db, err := database.ConnectDB(nil)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.CloseDB(db)

	// Run auto-migration for development
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run auto-migration: %v", err)
	}

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	router := gin.Default()

	// Add security middleware
	router.Use(middleware.RequestIDMiddleware(nil))
	
	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-ID")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"message": "TripFlow API is running",
		})
	})

	// Initialize file storage service
	fileStorage, err := filestorage.NewFileStorageService(nil)
	if err != nil {
		log.Fatalf("Failed to initialize file storage: %v", err)
	}

	// Initialize repositories
	scheduleRepo := repositories.NewScheduleRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler()
	fileHandler := handlers.NewFileHandler(fileStorage, db)
	scheduleHandler := handlers.NewScheduleHandler(scheduleRepo, fileStorage)

	// Public routes with rate limiting
	api := router.Group("/api")
	api.Use(middleware.CreateRateLimitMiddleware(middleware.PublicRateLimitConfig()))
	{
		// CSRF token endpoint (must be accessible without CSRF protection)
		api.GET("/csrf", middleware.CSRFInfoHandler)
		
		// Authentication routes with login rate limiting
		auth := api.Group("/auth")
		auth.Use(middleware.CreateRateLimitMiddleware(middleware.LoginRateLimitConfig()))
		{
			auth.POST("/login", authHandler.AdminLogin)
			auth.GET("/validate", authHandler.ValidateToken)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// File upload routes (public, but rate limited)
		api.POST("/upload", fileHandler.UploadFile)
		api.POST("/process-markdown", fileHandler.ProcessMarkdown)
		api.GET("/file/:path", fileHandler.GetFile)
		api.GET("/file/:path/info", fileHandler.GetFileInfo)

		// Public schedule routes
		api.GET("/schedules", scheduleHandler.ListSchedules)
		api.GET("/schedules/:id", scheduleHandler.GetSchedule)
		api.POST("/schedules/:id/share", scheduleHandler.IncrementShareCount)
	}

	// Protected routes (require authentication and CSRF protection)
	protected := api.Group("/admin")
	protected.Use(middleware.AdminOnlyMiddleware())
	protected.Use(middleware.CreateRateLimitMiddleware(middleware.AuthenticatedRateLimitConfig()))
	protected.Use(middleware.CSRFMiddleware(nil))
	{
			// Example protected endpoint
			protected.GET("/dashboard", func(c *gin.Context) {
				userID, _ := middleware.GetUserIDFromContext(c)
				userRole, _ := middleware.GetUserRoleFromContext(c)
				
				c.JSON(200, gin.H{
					"message": "Welcome to admin dashboard",
					"user_id": userID,
					"user_role": userRole,
				})
			})

			// File management endpoints (admin only)
			files := protected.Group("/file")
			{
				files.DELETE("/:path", fileHandler.DeleteFile)
			}
	}

	// User routes (require authentication but not admin)
	user := api.Group("/user")
	user.Use(middleware.AuthMiddleware(nil))
	user.Use(middleware.CreateRateLimitMiddleware(middleware.AuthenticatedRateLimitConfig()))
	{
		// Schedule management endpoints
		user.POST("/schedules", scheduleHandler.CreateSchedule)
		user.PUT("/schedules/:id", scheduleHandler.UpdateSchedule)
		user.DELETE("/schedules/:id", scheduleHandler.DeleteSchedule)
	}

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Starting TripFlow API server on port %s", port)
	log.Printf("📊 Health check: http://localhost:%s/health", port)
	log.Printf("🔐 Admin login: http://localhost:%s/api/auth/login", port)
	
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}