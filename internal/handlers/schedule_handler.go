package handlers

import (
	"net/http"
	"strconv"
	"time"

	"tripflow/internal/middleware"
	"tripflow/internal/models"
	"tripflow/internal/repositories"
	"tripflow/pkg/filestorage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ScheduleHandler handles schedule-related requests
type ScheduleHandler struct {
	scheduleRepo repositories.ScheduleRepository
	fileStorage  filestorage.FileStorageService
}

// NewScheduleHandler creates a new ScheduleHandler
func NewScheduleHandler(scheduleRepo repositories.ScheduleRepository, fileStorage filestorage.FileStorageService) *ScheduleHandler {
	return &ScheduleHandler{
		scheduleRepo: scheduleRepo,
		fileStorage:  fileStorage,
	}
}

// CreateScheduleRequest defines the request for creating a schedule
type CreateScheduleRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	FileID      string `json:"file_id" binding:"required"`
	IsPublic    bool   `json:"is_public"`
}

// UpdateScheduleRequest defines the request for updating a schedule
type UpdateScheduleRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	IsPublic    *bool   `json:"is_public,omitempty"`
}

// ScheduleResponse defines the response for schedule operations
type ScheduleResponse struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Content     string    `json:"content"`
	IsPublic    bool      `json:"is_public"`
	FileID      string    `json:"file_id"`
	ShareCount  int       `json:"share_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	File        FileInfo  `json:"file,omitempty"`
}

// FileInfo represents file information in schedule response
type FileInfo struct {
	ID         string    `json:"id"`
	Filename   string    `json:"filename"`
	FileSize   int64     `json:"file_size"`
	MimeType   string    `json:"mime_type"`
	UploadDate time.Time `json:"upload_date"`
}

// ListSchedulesResponse defines the response for listing schedules
type ListSchedulesResponse struct {
	Schedules []ScheduleResponse `json:"schedules"`
	Total     int64              `json:"total"`
	Page      int                `json:"page"`
	Limit     int                `json:"limit"`
}

// CreateSchedule handles creating a new schedule
func (h *ScheduleHandler) CreateSchedule(c *gin.Context) {
	var req CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Get user ID from JWT context
	userIDStr, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "User ID not found in context",
		})
		return
	}

	// For MVP, generate a UUID for the user if the user ID is not a valid UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		// If user ID is not a valid UUID, generate one based on the string
		userID = uuid.NewSHA1(uuid.NameSpaceOID, []byte(userIDStr))
	}

	// Parse file ID
	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid file ID",
			"message": "File ID format is invalid",
		})
		return
	}

	// Check if file exists and belongs to user
	// Note: In a real implementation, you would need to add a method to check file ownership
	// For now, we'll assume the file exists and belongs to the user

	// Create schedule
	schedule := &models.Schedule{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		FileID:      fileID,
		IsPublic:    req.IsPublic,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.scheduleRepo.Create(schedule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create schedule",
			"message": err.Error(),
		})
		return
	}

	// Return created schedule
	// Note: For now, we'll create a dummy file object
	dummyFile := models.File{
		ID:         fileID,
		Filename:   "dummy.md",
		FileSize:   0,
		MimeType:   "text/markdown",
		UploadDate: time.Now(),
	}
	response := h.scheduleToResponse(schedule, dummyFile)
	c.JSON(http.StatusCreated, response)
}

// GetSchedule handles retrieving a single schedule
func (h *ScheduleHandler) GetSchedule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid schedule ID",
			"message": "Schedule ID format is invalid",
		})
		return
	}

	schedule, err := h.scheduleRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Schedule not found",
			"message": "Schedule with the given ID does not exist",
		})
		return
	}

	// Check if schedule is public or user owns it
	userIDStr, exists := middleware.GetUserIDFromContext(c)
	if !exists || schedule.UserID.String() != userIDStr {
		if !schedule.IsPublic {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Access denied",
				"message": "Schedule is not public and you are not the owner",
			})
			return
		}
	}

	response := h.scheduleToResponse(schedule, *schedule.File)
	c.JSON(http.StatusOK, response)
}

// ListSchedules handles listing schedules with pagination
func (h *ScheduleHandler) ListSchedules(c *gin.Context) {
	// Parse pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	isPublicStr := c.Query("is_public")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Parse is_public filter
	var isPublic *bool
	if isPublicStr != "" {
		if isPublicStr == "true" {
			val := true
			isPublic = &val
		} else if isPublicStr == "false" {
			val := false
			isPublic = &val
		}
	}

	// Get schedules
	schedules, total, err := h.scheduleRepo.List(offset, limit, isPublic)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve schedules",
			"message": err.Error(),
		})
		return
	}

	// Convert to response format
	response := ListSchedulesResponse{
		Schedules: make([]ScheduleResponse, len(schedules)),
		Total:     total,
		Page:      page,
		Limit:     limit,
	}

	for i, schedule := range schedules {
		response.Schedules[i] = h.scheduleToResponse(schedule, *schedule.File)
	}

	c.JSON(http.StatusOK, response)
}

// UpdateSchedule handles updating a schedule
func (h *ScheduleHandler) UpdateSchedule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid schedule ID",
			"message": "Schedule ID format is invalid",
		})
		return
	}

	var req UpdateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Get user ID from JWT context
	userIDStr, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "User ID not found in context",
		})
		return
	}

	// For MVP, generate a UUID for the user if the user ID is not a valid UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		// If user ID is not a valid UUID, generate one based on the string
		userID = uuid.NewSHA1(uuid.NameSpaceOID, []byte(userIDStr))
	}

	// Get existing schedule
	schedule, err := h.scheduleRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Schedule not found",
			"message": "Schedule with the given ID does not exist",
		})
		return
	}

	// Check ownership
	if schedule.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Access denied",
			"message": "You can only update your own schedules",
		})
		return
	}

	// Update fields if provided
	if req.Title != nil {
		schedule.Title = *req.Title
	}
	if req.Description != nil {
		schedule.Description = *req.Description
	}
	if req.IsPublic != nil {
		schedule.IsPublic = *req.IsPublic
	}

	schedule.UpdatedAt = time.Now()

	// Save changes
	if err := h.scheduleRepo.Update(schedule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update schedule",
			"message": err.Error(),
		})
		return
	}

	response := h.scheduleToResponse(schedule, *schedule.File)
	c.JSON(http.StatusOK, response)
}

// DeleteSchedule handles deleting a schedule
func (h *ScheduleHandler) DeleteSchedule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid schedule ID",
			"message": "Schedule ID format is invalid",
		})
		return
	}

	// Get user ID from JWT context
	userIDStr, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "User ID not found in context",
		})
		return
	}

	// For MVP, generate a UUID for the user if the user ID is not a valid UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		// If user ID is not a valid UUID, generate one based on the string
		userID = uuid.NewSHA1(uuid.NameSpaceOID, []byte(userIDStr))
	}

	// Get existing schedule
	schedule, err := h.scheduleRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Schedule not found",
			"message": "Schedule with the given ID does not exist",
		})
		return
	}

	// Check ownership
	if schedule.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Access denied",
			"message": "You can only delete your own schedules",
		})
		return
	}

	// Delete associated file
	if err := h.fileStorage.DeleteFile(schedule.File.FilePath); err != nil {
		// Log error but continue with schedule deletion
		// In production, you might want to handle this differently
	}

	// Delete schedule
	if err := h.scheduleRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete schedule",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// scheduleToResponse converts a schedule model to response format
func (h *ScheduleHandler) scheduleToResponse(schedule *models.Schedule, file models.File) ScheduleResponse {
	response := ScheduleResponse{
		ID:          schedule.ID.String(),
		UserID:      schedule.UserID.String(),
		Title:       schedule.Title,
		Description: schedule.Description,
		Content:     schedule.Content,
		IsPublic:    schedule.IsPublic,
		FileID:      schedule.FileID.String(),
		ShareCount:  schedule.ShareCount,
		CreatedAt:   schedule.CreatedAt,
		UpdatedAt:   schedule.UpdatedAt,
	}

	response.File = FileInfo{
		ID:         file.ID.String(),
		Filename:   file.Filename,
		FileSize:   file.FileSize,
		MimeType:   file.MimeType,
		UploadDate: file.UploadDate,
	}

	return response
}

// IncrementShareCount handles incrementing the share count for a schedule
func (h *ScheduleHandler) IncrementShareCount(c *gin.Context) {
	scheduleIDStr := c.Param("id")
	scheduleID, err := uuid.Parse(scheduleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid schedule ID",
			"message": "Schedule ID format is invalid",
		})
		return
	}

	// Get the schedule first to check if it exists
	schedule, err := h.scheduleRepo.GetByID(scheduleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Schedule not found",
			"message": "The requested schedule does not exist",
		})
		return
	}

	// Increment the share count
	schedule.IncrementShareCount()

	// Update the schedule in the database
	if err := h.scheduleRepo.Update(schedule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update share count",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Share count incremented successfully",
		"share_count": schedule.ShareCount,
	})
}
