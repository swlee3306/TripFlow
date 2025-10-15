package handler

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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

		// Upload markdown file
		api.POST("/upload", func(c *gin.Context) {
			file, err := c.FormFile("file")
			if err != nil {
				c.JSON(400, gin.H{
					"error": "No file uploaded",
					"message": "파일을 선택해주세요",
				})
				return
			}

			// Validate file type
			allowedTypes := []string{".md", ".markdown"}
			fileExt := filepath.Ext(file.Filename)
			isValidType := false
			for _, ext := range allowedTypes {
				if fileExt == ext {
					isValidType = true
					break
				}
			}

			if !isValidType {
				c.JSON(400, gin.H{
					"error": "Invalid file type",
					"message": "마크다운 파일만 업로드 가능합니다",
				})
				return
			}

			// Read file content
			src, err := file.Open()
			if err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to read file",
					"message": "파일 읽기 중 오류가 발생했습니다",
				})
				return
			}
			defer src.Close()

			content, err := ioutil.ReadAll(src)
			if err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to read file content",
					"message": "파일 내용 읽기 중 오류가 발생했습니다",
				})
				return
			}

			// Save to JSON database
			if err := saveMarkdownFile(file.Filename, string(content), file.Size); err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to save file",
					"message": "파일 저장 중 오류가 발생했습니다",
				})
				return
			}

			c.JSON(200, gin.H{
				"success": true,
				"filename": file.Filename,
				"size": file.Size,
				"message": "파일이 성공적으로 업로드되었습니다",
			})
		})
	}
}

// MarkdownFile represents a markdown file in the database
type MarkdownFile struct {
	Filename  string `json:"filename"`
	Content   string `json:"content"`
	Size      int64  `json:"size"`
	CreatedAt string `json:"created_at"`
}

// getMarkdownFiles returns a list of markdown files from JSON database
func getMarkdownFiles() ([]gin.H, error) {
	dbPath := "frontend/public/markdown-files/database.json"
	
	// Check if database exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return []gin.H{}, nil
	}

	// Read database file
	data, err := ioutil.ReadFile(dbPath)
	if err != nil {
		return nil, err
	}

	var files []MarkdownFile
	if err := json.Unmarshal(data, &files); err != nil {
		return nil, err
	}

	var result []gin.H
	for _, file := range files {
		result = append(result, gin.H{
			"name": file.Filename,
			"size": file.Size,
		})
	}

	return result, nil
}

// getMarkdownFile returns the content of a specific markdown file
func getMarkdownFile(filename string) (string, error) {
	// Security check: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return "", fmt.Errorf("invalid filename")
	}

	dbPath := "frontend/public/markdown-files/database.json"
	
	// Read database file
	data, err := ioutil.ReadFile(dbPath)
	if err != nil {
		return "", err
	}

	var files []MarkdownFile
	if err := json.Unmarshal(data, &files); err != nil {
		return "", err
	}

	// Find the file
	for _, file := range files {
		if file.Filename == filename {
			return file.Content, nil
		}
	}

	return "", fmt.Errorf("file not found")
}

// saveMarkdownFile saves a markdown file to the JSON database
func saveMarkdownFile(filename, content string, size int64) error {
	dbPath := "frontend/public/markdown-files/database.json"
	
	// Ensure directory exists
	if err := os.MkdirAll("frontend/public/markdown-files", 0755); err != nil {
		return err
	}

	var files []MarkdownFile
	
	// Read existing database if it exists
	if data, err := ioutil.ReadFile(dbPath); err == nil {
		json.Unmarshal(data, &files)
	}

	// Check if file already exists and update it
	found := false
	for i, file := range files {
		if file.Filename == filename {
			files[i].Content = content
			files[i].Size = size
			files[i].CreatedAt = time.Now().Format(time.RFC3339)
			found = true
			break
		}
	}

	// Add new file if not found
	if !found {
		files = append(files, MarkdownFile{
			Filename:  filename,
			Content:   content,
			Size:      size,
			CreatedAt: time.Now().Format(time.RFC3339),
		})
	}

	// Write back to database
	data, err := json.MarshalIndent(files, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(dbPath, data, 0644)
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