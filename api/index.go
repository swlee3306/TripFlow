package handler

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	
	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
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

		// Get markdown files list
		api.GET("/files", func(c *gin.Context) {
			files, err := getMarkdownFiles()
			if err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to read files",
					"message": "파일 목록을 불러올 수 없습니다",
				})
				return
			}
			c.JSON(200, files)
		})

		// Get specific markdown file
		api.GET("/files/:filename", func(c *gin.Context) {
			filename := c.Param("filename")
			content, err := getMarkdownFile(filename)
			if err != nil {
				c.JSON(404, gin.H{
					"error": "File not found",
					"message": "파일을 찾을 수 없습니다",
				})
				return
			}
			c.Header("Content-Type", "text/plain; charset=utf-8")
			c.String(200, content)
		})
	}
}

// getMarkdownFiles returns a list of markdown files
func getMarkdownFiles() ([]gin.H, error) {
	markdownDir := "frontend/public/markdown-files"
	if _, err := os.Stat(markdownDir); os.IsNotExist(err) {
		return []gin.H{}, nil
	}

	files, err := ioutil.ReadDir(markdownDir)
	if err != nil {
		return nil, err
	}

	var markdownFiles []gin.H
	for _, file := range files {
		if !file.IsDir() && (strings.HasSuffix(file.Name(), ".md") || strings.HasSuffix(file.Name(), ".markdown")) {
			markdownFiles = append(markdownFiles, gin.H{
				"name": file.Name(),
				"size": file.Size(),
			})
		}
	}

	return markdownFiles, nil
}

// getMarkdownFile returns the content of a specific markdown file
func getMarkdownFile(filename string) (string, error) {
	// Security check: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return "", fmt.Errorf("invalid filename")
	}

	filePath := filepath.Join("frontend/public/markdown-files", filename)
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	return string(content), nil
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