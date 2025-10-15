package handler

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Global router instance for serverless optimization
var router *gin.Engine

// In-memory storage for files (in production, use a proper database)
var fileStorage = make(map[string]MarkdownFile)

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

	// Initialize with sample file if storage is empty
	if len(fileStorage) == 0 {
		fileStorage["sample-trip.md"] = MarkdownFile{
			Filename:  "sample-trip.md",
			Content:   "# 제주도 3박 4일 여행\n\n## 1일차 - 제주시\n- **오전**: 제주공항 도착\n- **점심**: 제주시내 맛집 투어\n- **오후**: 제주도립미술관 관람\n- **저녁**: 동문시장 야시장\n\n## 2일차 - 서귀포\n- **오전**: 중문관광단지\n- **점심**: 서귀포 매운맛집\n- **오후**: 천지연폭포\n- **저녁**: 서귀포 칠십리\n\n## 3일차 - 한라산\n- **오전**: 한라산 등반\n- **점심**: 산정상에서 도시락\n- **오후**: 하산 후 휴식\n- **저녁**: 제주시내에서 회식\n\n## 4일차 - 출발\n- **오전**: 마지막 쇼핑\n- **점심**: 공항 근처 식당\n- **오후**: 제주공항 출발\n\n### 예산\n- 항공료: 200,000원\n- 숙박비: 150,000원\n- 식비: 100,000원\n- 교통비: 50,000원\n\n**총 예산: 500,000원**",
			Size:      786,
			CreatedAt: time.Now().Format(time.RFC3339),
		}
	}
	
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
			// Return static sample file for now
			files := []gin.H{
				{
					"name": "sample-trip.md",
					"size": 786,
				},
			}
			c.JSON(200, files)
		})

		// Get specific markdown file
		api.GET("/files/:filename", func(c *gin.Context) {
			filename := c.Param("filename")
			
			// Return sample content for demo
			if filename == "sample-trip.md" {
				content := `# 제주도 3박 4일 여행

## 1일차 - 제주시
- **오전**: 제주공항 도착
- **점심**: 제주시내 맛집 투어
- **오후**: 제주도립미술관 관람
- **저녁**: 동문시장 야시장

## 2일차 - 서귀포
- **오전**: 중문관광단지
- **점심**: 서귀포 매운맛집
- **오후**: 천지연폭포
- **저녁**: 서귀포 칠십리

## 3일차 - 한라산
- **오전**: 한라산 등반
- **점심**: 산정상에서 도시락
- **오후**: 하산 후 휴식
- **저녁**: 제주시내에서 회식

## 4일차 - 출발
- **오전**: 마지막 쇼핑
- **점심**: 공항 근처 식당
- **오후**: 제주공항 출발

### 예산
- 항공료: 200,000원
- 숙박비: 150,000원
- 식비: 100,000원
- 교통비: 50,000원

**총 예산: 500,000원**`
				c.Header("Content-Type", "text/plain; charset=utf-8")
				c.String(200, content)
				return
			}
			
			c.JSON(404, gin.H{
				"error": "File not found",
				"message": "파일을 찾을 수 없습니다",
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

			// For demo purposes, just return success
			// In production, this would save to a proper database
			c.JSON(200, gin.H{
				"success": true,
				"filename": file.Filename,
				"size": file.Size,
				"message": "파일이 성공적으로 업로드되었습니다 (데모 모드)",
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

// getMarkdownFiles returns a list of markdown files from memory storage
func getMarkdownFiles() ([]gin.H, error) {
	var result []gin.H
	for _, file := range fileStorage {
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

	// Get file from memory storage
	if file, exists := fileStorage[filename]; exists {
		return file.Content, nil
	}

	return "", fmt.Errorf("file not found")
}

// saveMarkdownFile saves a markdown file to memory storage
func saveMarkdownFile(filename, content string, size int64) error {
	// Store file in memory
	fileStorage[filename] = MarkdownFile{
		Filename:  filename,
		Content:   content,
		Size:      size,
		CreatedAt: time.Now().Format(time.RFC3339),
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