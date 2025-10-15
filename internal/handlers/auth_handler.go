package handlers

import (
	"net/http"
	"os"

	"tripflow/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	jwtService *auth.JWTService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		jwtService: auth.NewJWTService(nil),
	}
}

// LoginRequest represents the login request structure
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response structure
type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID   string `json:"id"`
		Role string `json:"role"`
	} `json:"user"`
	ExpiresAt string `json:"expires_at"`
}

// AdminLogin handles administrator login
func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// For MVP, use hardcoded admin credentials
	// In production, this should be stored securely and hashed
	adminUsername := getEnvOrDefault("ADMIN_USERNAME", "admin")
	adminPassword := getEnvOrDefault("ADMIN_PASSWORD", "admin123")

	if req.Username != adminUsername || req.Password != adminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	// Generate JWT token
	userID := "admin-user-123" // In production, this should be the actual user ID from database
	role := "admin"
	
	token, err := h.jwtService.GenerateToken(userID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
		})
		return
	}

	// Get token expiration
	expiration, err := h.jwtService.GetTokenExpiration(token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get token expiration",
		})
		return
	}

	// Return success response
	response := LoginResponse{
		Token: token,
		User: struct {
			ID   string `json:"id"`
			Role string `json:"role"`
		}{
			ID:   userID,
			Role: role,
		},
		ExpiresAt: expiration.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, response)
}

// ValidateToken validates a JWT token
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authorization header required",
		})
		return
	}

	// Extract token from "Bearer <token>" format
	token := extractTokenFromHeader(authHeader)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid authorization header format",
		})
		return
	}

	// Validate token
	claims, err := h.jwtService.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token",
			"details": err.Error(),
		})
		return
	}

	// Return token info
	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user": gin.H{
			"id":   claims.UserID,
			"role": claims.Role,
		},
		"expires_at": claims.ExpiresAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// RefreshToken refreshes a JWT token
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authorization header required",
		})
		return
	}

	// Extract token from "Bearer <token>" format
	token := extractTokenFromHeader(authHeader)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid authorization header format",
		})
		return
	}

	// Refresh token
	newToken, err := h.jwtService.RefreshToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Failed to refresh token",
			"details": err.Error(),
		})
		return
	}

	// Get new token expiration
	expiration, err := h.jwtService.GetTokenExpiration(newToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get token expiration",
		})
		return
	}

	// Return new token
	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
		"expires_at": expiration.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// extractTokenFromHeader extracts the token from "Bearer <token>" format
func extractTokenFromHeader(authHeader string) string {
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return ""
}

// getEnvOrDefault gets an environment variable or returns a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
