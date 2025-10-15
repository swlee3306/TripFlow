package filestorage

import (
	"os"
	"path/filepath"
)

// Config holds configuration for file storage services
type Config struct {
	BaseDir string // Base directory for file storage
}

// DefaultConfig returns the default configuration
// In Vercel serverless environment, uses /tmp directory
// In local development, uses a temporary directory
func DefaultConfig() *Config {
	baseDir := os.Getenv("FILE_STORAGE_BASE_DIR")
	if baseDir == "" {
		// Check if we're in a Vercel environment
		if os.Getenv("VERCEL") == "1" {
			baseDir = "/tmp"
		} else {
			// For local development, use a temporary directory
			baseDir = filepath.Join(os.TempDir(), "tripflow-files")
		}
	}
	
	return &Config{
		BaseDir: baseDir,
	}
}

// NewFileStorageService creates a file storage service based on configuration
func NewFileStorageService(config *Config) (FileStorageService, error) {
	if config == nil {
		config = DefaultConfig()
	}
	
	return NewLocalFileStorage(config.BaseDir)
}
