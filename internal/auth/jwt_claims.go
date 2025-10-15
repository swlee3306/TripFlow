package auth

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CustomClaims represents the JWT claims structure
type CustomClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	SecretKey     string
	ExpirationTime time.Duration
	Issuer        string
}

// DefaultJWTConfig returns default JWT configuration
func DefaultJWTConfig() *JWTConfig {
	return &JWTConfig{
		SecretKey:      LoadJWTSecret(),
		ExpirationTime: 24 * time.Hour, // 24 hours
		Issuer:         "tripflow",
	}
}

// LoadJWTSecret loads the JWT secret key from environment variables
func LoadJWTSecret() string {
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		// For development, use a default secret (should be overridden in production)
		return "tripflow-dev-secret-key-change-in-production"
	}
	return secret
}

// NewCustomClaims creates a new CustomClaims instance
func NewCustomClaims(userID, role string) *CustomClaims {
	now := time.Now()
	return &CustomClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "tripflow",
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
}

// IsValid checks if the claims are valid
func (c *CustomClaims) IsValid() bool {
	return c.UserID != "" && c.Role != ""
}

// IsAdmin checks if the user has admin role
func (c *CustomClaims) IsAdmin() bool {
	return c.Role == "admin"
}

// IsExpired checks if the token is expired
func (c *CustomClaims) IsExpired() bool {
	return time.Now().After(c.ExpiresAt.Time)
}
