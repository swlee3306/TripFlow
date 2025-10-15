package middleware

import (
	"crypto/rand"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/csrf"
)

// CSRFConfig holds configuration for CSRF protection
type CSRFConfig struct {
	SecretKey    []byte
	CookieName   string
	CookiePath   string
	Secure       bool
	SameSite     http.SameSite
	HeaderName   string
	FieldName    string
	ErrorHandler func(c *gin.Context)
}

// DefaultCSRFConfig returns default CSRF configuration
func DefaultCSRFConfig() *CSRFConfig {
	secretKey := getCSRFSecretKey()
	
	return &CSRFConfig{
		SecretKey:  secretKey,
		CookieName: "_csrf",
		CookiePath: "/",
		Secure:     false, // Set to true in production with HTTPS
		SameSite:   http.SameSiteStrictMode,
		HeaderName: "X-CSRF-Token",
		FieldName:  "csrf_token",
		ErrorHandler: csrfErrorHandler,
	}
}

// getCSRFSecretKey gets or generates CSRF secret key
func getCSRFSecretKey() []byte {
	secret := os.Getenv("CSRF_SECRET_KEY")
	if secret != "" {
		return []byte(secret)
	}
	
	// Generate a random secret key for development
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return bytes
}

// CSRFMiddleware creates a CSRF protection middleware
func CSRFMiddleware(config *CSRFConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultCSRFConfig()
	}

	// Create CSRF protection
	csrfProtection := csrf.Protect(
		config.SecretKey,
		csrf.Secure(config.Secure),
		csrf.CookieName(config.CookieName),
		csrf.ErrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// This will be handled by the Gin error handler
		})),
	)

	return func(c *gin.Context) {
		// Convert Gin context to HTTP handler
		handler := csrfProtection(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Set CSRF token in context for handlers to access
			token := csrf.Token(r)
			c.Set("csrfToken", token)
			c.Set("csrfHeaderName", config.HeaderName)
			c.Set("csrfFieldName", config.FieldName)
			
			// Continue to next handler
			c.Next()
		}))

		// Execute the CSRF protection
		handler.ServeHTTP(c.Writer, c.Request)
	}
}

// csrfErrorHandler handles CSRF validation errors
func csrfErrorHandler(c *gin.Context) {
	requestID, _ := GetRequestIDFromContext(c)
	
	c.JSON(http.StatusForbidden, gin.H{
		"error": "CSRF token validation failed",
		"message": "Invalid or missing CSRF token",
		"request_id": requestID,
		"hint": "Include a valid CSRF token in the request",
	})
}

// GetCSRFTokenFromContext extracts CSRF token from Gin context
func GetCSRFTokenFromContext(c *gin.Context) (string, bool) {
	token, exists := c.Get("csrfToken")
	if !exists {
		return "", false
	}
	
	tokenStr, ok := token.(string)
	return tokenStr, ok
}

// GetCSRFHeaderNameFromContext extracts CSRF header name from Gin context
func GetCSRFHeaderNameFromContext(c *gin.Context) (string, bool) {
	headerName, exists := c.Get("csrfHeaderName")
	if !exists {
		return "", false
	}
	
	headerNameStr, ok := headerName.(string)
	return headerNameStr, ok
}

// GetCSRFFieldNameFromContext extracts CSRF field name from Gin context
func GetCSRFFieldNameFromContext(c *gin.Context) (string, bool) {
	fieldName, exists := c.Get("csrfFieldName")
	if !exists {
		return "", false
	}
	
	fieldNameStr, ok := fieldName.(string)
	return fieldNameStr, ok
}

// CSRFInfoHandler returns CSRF token information for frontend
func CSRFInfoHandler(c *gin.Context) {
	token, _ := GetCSRFTokenFromContext(c)
	headerName, _ := GetCSRFHeaderNameFromContext(c)
	fieldName, _ := GetCSRFFieldNameFromContext(c)
	requestID, _ := GetRequestIDFromContext(c)
	
	c.JSON(http.StatusOK, gin.H{
		"csrf_token": token,
		"header_name": headerName,
		"field_name": fieldName,
		"request_id": requestID,
		"message": "Include this token in subsequent requests",
	})
}
