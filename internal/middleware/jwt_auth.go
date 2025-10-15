package middleware

import (
	"net/http"

	"tripflow/internal/auth"

	"github.com/gin-gonic/gin"
)

// JWTConfig holds JWT middleware configuration
type JWTConfig struct {
	JWTService *auth.JWTService
	RequiredRole string // Optional: specific role required
}

// DefaultJWTConfig returns default JWT middleware configuration
func DefaultJWTConfig() *JWTConfig {
	return &JWTConfig{
		JWTService: auth.NewJWTService(nil),
	}
}

// AuthMiddleware creates a JWT authentication middleware
func AuthMiddleware(config *JWTConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultJWTConfig()
	}

	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			return
		}

		// Extract token from "Bearer <token>" format
		token := extractTokenFromHeader(authHeader)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format. Expected: Bearer <token>",
			})
			return
		}

		// Validate token
		claims, err := config.JWTService.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
				"details": err.Error(),
			})
			return
		}

		// Check role requirement if specified
		if config.RequiredRole != "" && claims.Role != config.RequiredRole {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"required_role": config.RequiredRole,
				"user_role": claims.Role,
			})
			return
		}

		// Store user information in context for downstream handlers
		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Set("userClaims", claims)

		// Continue to next handler
		c.Next()
	}
}

// AdminOnlyMiddleware creates a middleware that requires admin role
func AdminOnlyMiddleware() gin.HandlerFunc {
	config := DefaultJWTConfig()
	config.RequiredRole = "admin"
	return AuthMiddleware(config)
}

// extractTokenFromHeader extracts the token from "Bearer <token>" format
func extractTokenFromHeader(authHeader string) string {
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return ""
}

// GetUserIDFromContext extracts user ID from Gin context
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return "", false
	}
	
	userIDStr, ok := userID.(string)
	return userIDStr, ok
}

// GetUserRoleFromContext extracts user role from Gin context
func GetUserRoleFromContext(c *gin.Context) (string, bool) {
	userRole, exists := c.Get("userRole")
	if !exists {
		return "", false
	}
	
	userRoleStr, ok := userRole.(string)
	return userRoleStr, ok
}

// GetUserClaimsFromContext extracts user claims from Gin context
func GetUserClaimsFromContext(c *gin.Context) (*auth.CustomClaims, bool) {
	claims, exists := c.Get("userClaims")
	if !exists {
		return nil, false
	}
	
	userClaims, ok := claims.(*auth.CustomClaims)
	return userClaims, ok
}

// RequireRole creates a middleware that requires a specific role
func RequireRole(role string) gin.HandlerFunc {
	config := DefaultJWTConfig()
	config.RequiredRole = role
	return AuthMiddleware(config)
}

// OptionalAuthMiddleware creates a middleware that validates JWT if present but doesn't require it
func OptionalAuthMiddleware() gin.HandlerFunc {
	config := DefaultJWTConfig()
	
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Extract token from "Bearer <token>" format
		token := extractTokenFromHeader(authHeader)
		if token == "" {
			// Invalid format, continue without authentication
			c.Next()
			return
		}

		// Validate token
		claims, err := config.JWTService.ValidateToken(token)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Store user information in context for downstream handlers
		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Set("userClaims", claims)

		// Continue to next handler
		c.Next()
	}
}
