package handlers

import (
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"tripflow/internal/models"
	"tripflow/internal/services"
	"tripflow/pkg/filestorage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FileHandler handles file-related requests
type FileHandler struct {
	fileStorage     filestorage.FileStorageService
	db              *gorm.DB
	markdownService *services.MarkdownService
}

// NewFileHandler creates a new FileHandler
func NewFileHandler(fileStorage filestorage.FileStorageService, db *gorm.DB) *FileHandler {
	markdownService := services.NewMarkdownService(fileStorage)
	return &FileHandler{
		fileStorage:     fileStorage,
		db:              db,
		markdownService: markdownService,
	}
}

// UploadFileRequest defines the request for file upload
type UploadFileRequest struct {
	// File is handled via multipart form data
}

// UploadFileResponse defines the response for file upload
type UploadFileResponse struct {
	FileID   string `json:"file_id"`
	FilePath string `json:"file_path"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	MimeType string `json:"mime_type"`
}

// UploadFile handles file upload requests
func (h *FileHandler) UploadFile(c *gin.Context) {
	// Get the file from the form data
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No file provided",
			"message": "Please provide a file in the 'file' field",
		})
		return
	}
	defer file.Close()

	// Validate file size (10MB limit)
	const maxFileSize = 10 * 1024 * 1024 // 10MB
	if header.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "File too large",
			"message": "File size must be less than 10MB",
		})
		return
	}

	// Validate file type (only markdown files for now)
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".md" && ext != ".markdown" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid file type",
			"message": "Only markdown files (.md, .markdown) are allowed",
		})
		return
	}

	// Upload the file
	filePath, err := h.fileStorage.UploadFile(file, header.Filename, header.Header.Get("Content-Type"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Upload failed",
			"message": "Failed to upload file: " + err.Error(),
		})
		return
	}

	// Get file info
	fileInfo, err := h.fileStorage.GetFileInfo(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "File info failed",
			"message": "Failed to get file information: " + err.Error(),
		})
		return
	}

	// Generate a unique file ID
	fileID := uuid.New()
	
	// Get schedule_id from form data (optional) - for future use
	// scheduleIDStr := c.PostForm("schedule_id")
	// var scheduleID *uuid.UUID
	// if scheduleIDStr != "" {
	// 	if parsedID, err := uuid.Parse(scheduleIDStr); err == nil {
	// 		scheduleID = &parsedID
	// 	}
	// }

	// Create file record in database
	fileRecord := models.File{
		ID:         fileID,
		UserID:     uuid.New(), // For MVP, generate a random user ID
		Filename:   header.Filename,
		FilePath:   filePath,
		FileSize:   fileInfo.Size,
		MimeType:   fileInfo.MimeType,
		UploadDate: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Save to database
	if err := h.db.Create(&fileRecord).Error; err != nil {
		// If database save fails, clean up the uploaded file
		h.fileStorage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database save failed",
			"message": "Failed to save file metadata: " + err.Error(),
		})
		return
	}

	response := UploadFileResponse{
		FileID:   fileID.String(),
		FilePath: filePath,
		Filename: header.Filename,
		Size:     fileInfo.Size,
		MimeType: fileInfo.MimeType,
	}

	c.JSON(http.StatusOK, response)
}

// ProcessMarkdownRequest defines the request for markdown processing
type ProcessMarkdownRequest struct {
	FileID string `json:"file_id" binding:"required"`
}

// ProcessMarkdownResponse defines the response for markdown processing
type ProcessMarkdownResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	HTMLContent string `json:"html_content"`
}

// ProcessMarkdown processes a markdown file and returns the processed content
func (h *FileHandler) ProcessMarkdown(c *gin.Context) {
	var req ProcessMarkdownRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Get file record from database
	var file models.File
	if err := h.db.Where("id = ?", req.FileID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "File not found",
			"message": "File with ID " + req.FileID + " not found",
		})
		return
	}

	// Process markdown file
	processedContent, err := h.markdownService.ProcessMarkdownFromFile(file.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Processing failed",
			"message": "Failed to process markdown file: " + err.Error(),
		})
		return
	}

	response := ProcessMarkdownResponse{
		Title:       processedContent.Title,
		Description: processedContent.Description,
		HTMLContent: processedContent.HTMLContent,
	}

	c.JSON(http.StatusOK, response)
}

// GetFile handles file retrieval requests
func (h *FileHandler) GetFile(c *gin.Context) {
	filePath := c.Param("path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Path required",
			"message": "File path is required",
		})
		return
	}
	
	// Remove leading slash if present
	if strings.HasPrefix(filePath, "/") {
		filePath = filePath[1:]
	}

	// Get the file
	fileReader, err := h.fileStorage.GetFile(filePath)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "File not found",
				"message": "The requested file does not exist",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "File retrieval failed",
				"message": "Failed to retrieve file: " + err.Error(),
			})
		}
		return
	}
	defer func() {
		if closer, ok := fileReader.(io.Closer); ok {
			closer.Close()
		}
	}()

	// Get file info for content type
	fileInfo, err := h.fileStorage.GetFileInfo(filePath)
	if err != nil {
		// If we can't get file info, use default content type
		c.Header("Content-Type", "application/octet-stream")
	} else {
		c.Header("Content-Type", fileInfo.MimeType)
	}

	// Stream the file content
	io.Copy(c.Writer, fileReader)
}

// DeleteFile handles file deletion requests
func (h *FileHandler) DeleteFile(c *gin.Context) {
	filePath := c.Param("path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Path required",
			"message": "File path is required",
		})
		return
	}
	
	// Remove leading slash if present
	if strings.HasPrefix(filePath, "/") {
		filePath = filePath[1:]
	}

	// Delete the file
	err := h.fileStorage.DeleteFile(filePath)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "File not found",
				"message": "The requested file does not exist",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "File deletion failed",
				"message": "Failed to delete file: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
	})
}

// GetFileInfo handles file information requests
func (h *FileHandler) GetFileInfo(c *gin.Context) {
	filePath := c.Param("path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Path required",
			"message": "File path is required",
		})
		return
	}
	
	// Remove leading slash if present
	if strings.HasPrefix(filePath, "/") {
		filePath = filePath[1:]
	}

	// Get file info
	fileInfo, err := h.fileStorage.GetFileInfo(filePath)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "File not found",
				"message": "The requested file does not exist",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "File info failed",
				"message": "Failed to get file information: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, fileInfo)
}
