package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// Global router instance for serverless optimization
var router *gin.Engine

// Redis configuration
var redisURL = "redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928"
var redisClient *redis.Client

// initRedis initializes Redis client
func initRedis() {
	log.Printf("Initializing Redis connection...")
	
	// Parse Redis URL
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Failed to parse Redis URL: %v", err)
		return
	}
	
	redisClient = redis.NewClient(opt)
	
	// Test connection
	ctx := context.Background()
	_, err = redisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
		redisClient = nil
	} else {
		log.Printf("Redis connected successfully")
	}
}

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

	// Initialize Redis connection
	initRedis()

	
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
		redisStatus := "disconnected"
		if redisClient != nil {
			ctx := context.Background()
			_, err := redisClient.Ping(ctx).Result()
			if err == nil {
				redisStatus = "connected"
			} else {
				redisStatus = "error: " + err.Error()
			}
		}
		
		c.JSON(200, gin.H{
			"status": "ok",
			"message": "TripFlow API is running",
			"redis": redisStatus,
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

		// Delete markdown file
		api.DELETE("/files/:filename", func(c *gin.Context) {
			filename := c.Param("filename")
			
			// Security check: prevent directory traversal
			if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
				c.JSON(400, gin.H{
					"error": "Invalid filename",
					"message": "잘못된 파일명입니다",
				})
				return
			}
			
			// Delete file from Redis
			if err := deleteMarkdownFile(filename); err != nil {
				log.Printf("Failed to delete file: %v", err)
				c.JSON(500, gin.H{
					"error": "Failed to delete file",
					"message": "파일 삭제 중 오류가 발생했습니다",
					"details": err.Error(),
				})
				return
			}
			
			c.JSON(200, gin.H{
				"success": true,
				"filename": filename,
				"message": "파일이 성공적으로 삭제되었습니다",
			})
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

			content, err := io.ReadAll(src)
			if err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to read file content",
					"message": "파일 내용 읽기 중 오류가 발생했습니다",
				})
				return
			}

			// Save to Redis
			if err := saveMarkdownFile(file.Filename, string(content), file.Size); err != nil {
				log.Printf("Failed to save file: %v", err)
				c.JSON(500, gin.H{
					"error": "Failed to save file",
					"message": "파일 저장 중 오류가 발생했습니다",
					"details": err.Error(),
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

// getMarkdownFiles returns a list of markdown files from Vercel KV
func getMarkdownFiles() ([]gin.H, error) {
	// Get file list from KV
	fileList, err := kvGet("files:list")
	if err != nil {
		// If no files exist, return empty list
		return []gin.H{}, nil
	}

	var files []MarkdownFile
	if err := json.Unmarshal([]byte(fileList), &files); err != nil {
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

	// Get file content from KV
	content, err := kvGet("file:" + filename)
	if err != nil {
		return "", fmt.Errorf("file not found")
	}

	return content, nil
}

// saveMarkdownFile saves a markdown file to Redis
func saveMarkdownFile(filename, content string, size int64) error {
	// Store file content in Redis
	if err := kvSet("file:"+filename, content); err != nil {
		log.Printf("Failed to save file content to Redis: %v", err)
		return fmt.Errorf("Redis 저장 실패: %v", err)
	}

	// Update file list
	fileList, err := kvGet("files:list")
	var files []MarkdownFile
	if err == nil && fileList != "" {
		if err := json.Unmarshal([]byte(fileList), &files); err != nil {
			log.Printf("Failed to unmarshal file list: %v", err)
			files = []MarkdownFile{}
		}
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

	// Save updated file list
	fileListData, err := json.Marshal(files)
	if err != nil {
		log.Printf("Failed to marshal file list: %v", err)
		return fmt.Errorf("파일 목록 직렬화 실패: %v", err)
	}

	if err := kvSet("files:list", string(fileListData)); err != nil {
		log.Printf("Failed to save file list to Redis: %v", err)
		return fmt.Errorf("파일 목록 저장 실패: %v", err)
	}

	return nil
}

// deleteMarkdownFile deletes a markdown file from Redis
func deleteMarkdownFile(filename string) error {
	// Delete file content from Redis
	if err := kvDelete("file:" + filename); err != nil {
		log.Printf("Failed to delete file content from Redis: %v", err)
		return fmt.Errorf("Redis 파일 삭제 실패: %v", err)
	}

	// Update file list
	fileList, err := kvGet("files:list")
	var files []MarkdownFile
	if err == nil && fileList != "" {
		if err := json.Unmarshal([]byte(fileList), &files); err != nil {
			log.Printf("Failed to unmarshal file list: %v", err)
			files = []MarkdownFile{}
		}
	}

	// Remove file from list
	var updatedFiles []MarkdownFile
	for _, file := range files {
		if file.Filename != filename {
			updatedFiles = append(updatedFiles, file)
		}
	}

	// Save updated file list
	fileListData, err := json.Marshal(updatedFiles)
	if err != nil {
		log.Printf("Failed to marshal file list: %v", err)
		return fmt.Errorf("파일 목록 직렬화 실패: %v", err)
	}

	if err := kvSet("files:list", string(fileListData)); err != nil {
		log.Printf("Failed to save file list to Redis: %v", err)
		return fmt.Errorf("파일 목록 저장 실패: %v", err)
	}

	return nil
}

// kvGet retrieves a value from Redis Cloud
func kvGet(key string) (string, error) {
	if redisClient == nil {
		return "", fmt.Errorf("Redis not configured")
	}

	ctx := context.Background()
	val, err := redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found")
	}
	if err != nil {
		return "", err
	}

	return val, nil
}

// kvSet stores a value in Redis Cloud
func kvSet(key, value string) error {
	if redisClient == nil {
		return fmt.Errorf("Redis not configured")
	}

	ctx := context.Background()
	err := redisClient.Set(ctx, key, value, 0).Err()
	if err != nil {
		return err
	}

	return nil
}

// kvDelete deletes a key from Redis Cloud
func kvDelete(key string) error {
	if redisClient == nil {
		return fmt.Errorf("Redis not configured")
	}

	ctx := context.Background()
	err := redisClient.Del(ctx, key).Err()
	if err != nil {
		return err
	}

	return nil
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