package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequestIDConfig holds configuration for request ID middleware
type RequestIDConfig struct {
	HeaderName string
	Generator  func() string
}

// DefaultRequestIDConfig returns default request ID configuration
func DefaultRequestIDConfig() *RequestIDConfig {
	return &RequestIDConfig{
		HeaderName: "X-Request-ID",
		Generator:  generateRequestID,
	}
}

// RequestIDMiddleware creates a request ID middleware
func RequestIDMiddleware(config *RequestIDConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultRequestIDConfig()
	}

	return func(c *gin.Context) {
		// Check if request ID already exists in header
		requestID := c.GetHeader(config.HeaderName)
		if requestID == "" {
			requestID = config.Generator()
		}

		// Set request ID in context
		c.Set("requestID", requestID)
		c.Header(config.HeaderName, requestID)

		// Add to request context for logging
		ctx := context.WithValue(c.Request.Context(), "requestID", requestID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// GetRequestIDFromContext extracts request ID from Gin context
func GetRequestIDFromContext(c *gin.Context) (string, bool) {
	requestID, exists := c.Get("requestID")
	if !exists {
		return "", false
	}
	
	requestIDStr, ok := requestID.(string)
	return requestIDStr, ok
}

// GetRequestIDFromRequest extracts request ID from HTTP request context
func GetRequestIDFromRequest(r *http.Request) (string, bool) {
	requestID := r.Context().Value("requestID")
	if requestID == nil {
		return "", false
	}
	
	requestIDStr, ok := requestID.(string)
	return requestIDStr, ok
}
