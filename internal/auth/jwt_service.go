package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTService handles JWT operations
type JWTService struct {
	config *JWTConfig
}

// NewJWTService creates a new JWT service instance
func NewJWTService(config *JWTConfig) *JWTService {
	if config == nil {
		config = DefaultJWTConfig()
	}
	return &JWTService{
		config: config,
	}
}

// GenerateToken creates a new JWT token for the given user
func (j *JWTService) GenerateToken(userID, role string) (string, error) {
	claims := NewCustomClaims(userID, role)
	
	// Set custom expiration time if configured
	if j.config.ExpirationTime > 0 {
		claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(j.config.ExpirationTime))
	}
	
	// Set custom issuer if configured
	if j.config.Issuer != "" {
		claims.Issuer = j.config.Issuer
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	tokenString, err := token.SignedString([]byte(j.config.SecretKey))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates and parses a JWT token
func (j *JWTService) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.config.SecretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Additional validation
	if !claims.IsValid() {
		return nil, fmt.Errorf("invalid claims")
	}

	if claims.IsExpired() {
		return nil, fmt.Errorf("token expired")
	}

	return claims, nil
}

// RefreshToken generates a new token with extended expiration
func (j *JWTService) RefreshToken(tokenString string) (string, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return "", fmt.Errorf("invalid token for refresh: %w", err)
	}

	// Generate new token with same user info but extended expiration
	return j.GenerateToken(claims.UserID, claims.Role)
}

// GetTokenExpiration returns the expiration time of a token
func (j *JWTService) GetTokenExpiration(tokenString string) (time.Time, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return time.Time{}, err
	}
	return claims.ExpiresAt.Time, nil
}

// IsTokenValid checks if a token is valid without returning claims
func (j *JWTService) IsTokenValid(tokenString string) bool {
	_, err := j.ValidateToken(tokenString)
	return err == nil
}
