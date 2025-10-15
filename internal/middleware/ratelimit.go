package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	ginmiddleware "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	Rate    limiter.Rate
	Store   limiter.Store
	Options []ginmiddleware.Option
}

// DefaultRateLimitConfig returns default rate limit configuration
func DefaultRateLimitConfig() *RateLimitConfig {
	// 60 requests per minute
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  60,
	}

	// Use in-memory store for development
	store := memory.NewStore()

	return &RateLimitConfig{
		Rate:  rate,
		Store: store,
		Options: []ginmiddleware.Option{
			ginmiddleware.WithLimitReachedHandler(limitReachedHandler),
		},
	}
}

// PublicRateLimitConfig returns rate limit configuration for public endpoints
func PublicRateLimitConfig() *RateLimitConfig {
	// 30 requests per minute for public endpoints
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  30,
	}

	store := memory.NewStore()

	return &RateLimitConfig{
		Rate:  rate,
		Store: store,
		Options: []ginmiddleware.Option{
			ginmiddleware.WithLimitReachedHandler(limitReachedHandler),
		},
	}
}

// AuthenticatedRateLimitConfig returns rate limit configuration for authenticated endpoints
func AuthenticatedRateLimitConfig() *RateLimitConfig {
	// 120 requests per minute for authenticated endpoints
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  120,
	}

	store := memory.NewStore()

	return &RateLimitConfig{
		Rate:  rate,
		Store: store,
		Options: []ginmiddleware.Option{
			ginmiddleware.WithLimitReachedHandler(limitReachedHandler),
		},
	}
}

// LoginRateLimitConfig returns rate limit configuration for login endpoints
func LoginRateLimitConfig() *RateLimitConfig {
	// 5 login attempts per minute
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  5,
	}

	store := memory.NewStore()

	return &RateLimitConfig{
		Rate:  rate,
		Store: store,
		Options: []ginmiddleware.Option{
			ginmiddleware.WithLimitReachedHandler(limitReachedHandler),
		},
	}
}

// CreateRateLimitMiddleware creates a rate limiting middleware
func CreateRateLimitMiddleware(config *RateLimitConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultRateLimitConfig()
	}

	instance := limiter.New(config.Store, config.Rate)
	return ginmiddleware.NewMiddleware(instance, config.Options...)
}

// limitReachedHandler handles rate limit exceeded responses
func limitReachedHandler(c *gin.Context) {
	requestID, _ := GetRequestIDFromContext(c)
	
	c.JSON(http.StatusTooManyRequests, gin.H{
		"error": "Rate limit exceeded",
		"message": "Too many requests. Please try again later.",
		"request_id": requestID,
		"retry_after": "60 seconds",
	})
}

// GetRateLimitInfo returns rate limit information for the current request
func GetRateLimitInfo(c *gin.Context) map[string]interface{} {
	requestID, _ := GetRequestIDFromContext(c)
	
	return map[string]interface{}{
		"request_id": requestID,
		"timestamp": time.Now().Unix(),
		"message": "Rate limiting active",
	}
}
