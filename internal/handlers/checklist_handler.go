package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tripflow/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

// Global Redis client for serverless optimization
var checklistRedisClient *redis.Client

// initChecklistRedis initializes Redis Cloud client for checklists
func initChecklistRedis() {
	redisURL := "redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928"
	
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		fmt.Printf("Failed to parse Redis URL: %v", err)
		return
	}
	
	checklistRedisClient = redis.NewClient(opt)
	
	// Test connection
	ctx := context.Background()
	_, err = checklistRedisClient.Ping(ctx).Result()
	if err != nil {
		fmt.Printf("Failed to connect to Redis: %v", err)
		checklistRedisClient = nil
	} else {
		fmt.Printf("Redis Cloud connected successfully for checklists")
	}
}

// checklistKvGet retrieves a value from Redis Cloud
func checklistKvGet(key string) (string, error) {
	if checklistRedisClient == nil {
		initChecklistRedis()
		if checklistRedisClient == nil {
			return "", fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	val, err := checklistRedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found")
	}
	if err != nil {
		return "", err
	}

	return val, nil
}

// checklistKvSet stores a value in Redis Cloud
func checklistKvSet(key, value string) error {
	if checklistRedisClient == nil {
		initChecklistRedis()
		if checklistRedisClient == nil {
			return fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	err := checklistRedisClient.Set(ctx, key, value, 0).Err()
	if err != nil {
		return err
	}

	return nil
}

// checklistKvDelete deletes a key from Redis Cloud
func checklistKvDelete(key string) error {
	if checklistRedisClient == nil {
		initChecklistRedis()
		if checklistRedisClient == nil {
			return fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	err := checklistRedisClient.Del(ctx, key).Err()
	if err != nil {
		return err
	}

	return nil
}

// checklistKvKeys retrieves all keys matching a pattern from Redis Cloud
func checklistKvKeys(pattern string) ([]string, error) {
	if checklistRedisClient == nil {
		initChecklistRedis()
		if checklistRedisClient == nil {
			return nil, fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	keys, err := checklistRedisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, err
	}

	return keys, nil
}

type ChecklistHandler struct {
	redisClient *redis.Client
}

func NewChecklistHandler(redisClient *redis.Client) *ChecklistHandler {
	// Initialize Redis Cloud connection
	initChecklistRedis()
	
	return &ChecklistHandler{
		redisClient: redisClient,
	}
}

// CreateChecklist creates a new checklist
func (h *ChecklistHandler) CreateChecklist(c *gin.Context) {
	var req models.ChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Invalid request payload",
		})
		return
	}

	// Validate required fields
	if req.Name == "" || req.Type == "" || req.Duration == "" {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Name, type, and duration are required",
		})
		return
	}

	// Generate unique ID
	id := uuid.New().String()
	now := time.Now()

	checklist := models.Checklist{
		ID:        id,
		Name:      req.Name,
		Type:      req.Type,
		Duration:  req.Duration,
		Items:     req.Items,
		Completed: req.Completed,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save to Redis
	key := fmt.Sprintf("checklist:%s", id)
	checklistJSON, err := json.Marshal(checklist)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to serialize checklist",
		})
		return
	}

	if err := checklistKvSet(key, string(checklistJSON)); err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to save checklist",
		})
		return
	}

	c.JSON(http.StatusCreated, models.ChecklistResponse{
		Success: true,
		Message: "Checklist created successfully",
		Data:    &checklist,
	})
}

// GetChecklists retrieves all checklists
func (h *ChecklistHandler) GetChecklists(c *gin.Context) {
	keys, err := checklistKvKeys("checklist:*")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistListResponse{
			Success: false,
			Message: "Failed to retrieve checklists",
		})
		return
	}

	var checklists []models.Checklist
	for _, key := range keys {
		checklistJSON, err := checklistKvGet(key)
		if err != nil {
			continue // Skip invalid entries
		}

		var checklist models.Checklist
		if err := json.Unmarshal([]byte(checklistJSON), &checklist); err != nil {
			continue // Skip invalid entries
		}

		checklists = append(checklists, checklist)
	}

	c.JSON(http.StatusOK, models.ChecklistListResponse{
		Success: true,
		Data:    checklists,
	})
}

// GetChecklist retrieves a specific checklist by ID
func (h *ChecklistHandler) GetChecklist(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Checklist ID is required",
		})
		return
	}

	key := fmt.Sprintf("checklist:%s", id)
	checklistJSON, err := checklistKvGet(key)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ChecklistResponse{
			Success: false,
			Message: "Checklist not found",
		})
		return
	}

	var checklist models.Checklist
	if err := json.Unmarshal([]byte(checklistJSON), &checklist); err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to parse checklist",
		})
		return
	}

	c.JSON(http.StatusOK, models.ChecklistResponse{
		Success: true,
		Data:    &checklist,
	})
}

// UpdateChecklist updates an existing checklist
func (h *ChecklistHandler) UpdateChecklist(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Checklist ID is required",
		})
		return
	}

	var req models.ChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Invalid request payload",
		})
		return
	}

	// Check if checklist exists
	key := fmt.Sprintf("checklist:%s", id)
	existingJSON, err := checklistKvGet(key)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ChecklistResponse{
			Success: false,
			Message: "Checklist not found",
		})
		return
	}

	var existingChecklist models.Checklist
	if err := json.Unmarshal([]byte(existingJSON), &existingChecklist); err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to parse existing checklist",
		})
		return
	}

	// Update fields
	existingChecklist.Name = req.Name
	existingChecklist.Type = req.Type
	existingChecklist.Duration = req.Duration
	existingChecklist.Items = req.Items
	existingChecklist.Completed = req.Completed
	existingChecklist.UpdatedAt = time.Now()

	// Save updated checklist
	updatedJSON, err := json.Marshal(existingChecklist)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to serialize updated checklist",
		})
		return
	}

	if err := checklistKvSet(key, string(updatedJSON)); err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to update checklist",
		})
		return
	}

	c.JSON(http.StatusOK, models.ChecklistResponse{
		Success: true,
		Message: "Checklist updated successfully",
		Data:    &existingChecklist,
	})
}

// DeleteChecklist deletes a checklist
func (h *ChecklistHandler) DeleteChecklist(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, models.ChecklistResponse{
			Success: false,
			Message: "Checklist ID is required",
		})
		return
	}

	key := fmt.Sprintf("checklist:%s", id)
	
	// Check if checklist exists
	_, err := checklistKvGet(key)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ChecklistResponse{
			Success: false,
			Message: "Checklist not found",
		})
		return
	}

	// Delete checklist
	if err := checklistKvDelete(key); err != nil {
		c.JSON(http.StatusInternalServerError, models.ChecklistResponse{
			Success: false,
			Message: "Failed to delete checklist",
		})
		return
	}

	c.JSON(http.StatusOK, models.ChecklistResponse{
		Success: true,
		Message: "Checklist deleted successfully",
	})
}
