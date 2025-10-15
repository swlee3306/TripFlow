package filestorage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// LocalFileStorage implements FileStorageService using the local filesystem
type LocalFileStorage struct {
	baseDir string // Base directory for storing files
}

// NewLocalFileStorage creates a new LocalFileStorage instance
// Parameters:
//   - basePath: base directory path where files will be stored
// Returns:
//   - FileStorageService: interface implementation
//   - error: any error that occurred during initialization
func NewLocalFileStorage(basePath string) (FileStorageService, error) {
	if basePath == "" {
		return nil, fmt.Errorf("base path cannot be empty")
	}

	// Clean the path to ensure it's absolute and normalized
	basePath = filepath.Clean(basePath)

	// Check if the base directory exists, create it if it doesn't
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create base directory %s: %w", basePath, err)
	}

	// Verify that the directory is writable
	if err := os.Chmod(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to set permissions on base directory %s: %w", basePath, err)
	}

	return &LocalFileStorage{
		baseDir: basePath,
	}, nil
}

// UploadFile uploads a file to the local filesystem
func (lfs *LocalFileStorage) UploadFile(file io.Reader, filename string, mimeType string) (string, error) {
	if file == nil {
		return "", fmt.Errorf("file reader cannot be nil")
	}

	if filename == "" {
		return "", fmt.Errorf("filename cannot be empty")
	}

	// Generate a unique filename to prevent collisions
	uniqueID := uuid.New().String()
	ext := filepath.Ext(filename)
	if ext == "" {
		// If no extension, try to determine from MIME type
		ext = getExtensionFromMimeType(mimeType)
	}
	
	uniqueFilename := uniqueID + ext
	relativePath := filepath.Join("uploads", uniqueFilename)
	fullPath := filepath.Join(lfs.baseDir, relativePath)

	// Ensure the uploads directory exists
	uploadDir := filepath.Dir(fullPath)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create the file
	destFile, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file %s: %w", fullPath, err)
	}
	defer destFile.Close()

	// Copy the file content
	bytesWritten, err := io.Copy(destFile, file)
	if err != nil {
		// Clean up the file if copy failed
		os.Remove(fullPath)
		return "", fmt.Errorf("failed to write file content: %w", err)
	}

	if bytesWritten == 0 {
		// Clean up empty file
		os.Remove(fullPath)
		return "", fmt.Errorf("file is empty")
	}

	// Return the relative path (Unix-style separators for consistency)
	return strings.ReplaceAll(relativePath, "\\", "/"), nil
}

// GetFile retrieves a file from the local filesystem
func (lfs *LocalFileStorage) GetFile(path string) (io.Reader, error) {
	if path == "" {
		return nil, fmt.Errorf("path cannot be empty")
	}

	// Construct the full path
	fullPath := filepath.Join(lfs.baseDir, path)
	
	// Security check: ensure the path is within baseDir
	absBaseDir, err := filepath.Abs(lfs.baseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute base directory: %w", err)
	}
	
	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute file path: %w", err)
	}
	
	if !strings.HasPrefix(absFullPath, absBaseDir) {
		return nil, fmt.Errorf("path traversal detected: %s", path)
	}

	// Open the file
	file, err := os.Open(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", path)
		}
		return nil, fmt.Errorf("failed to open file %s: %w", path, err)
	}

	return file, nil
}

// DeleteFile removes a file from the local filesystem
func (lfs *LocalFileStorage) DeleteFile(path string) error {
	if path == "" {
		return fmt.Errorf("path cannot be empty")
	}

	// Construct the full path
	fullPath := filepath.Join(lfs.baseDir, path)
	
	// Security check: ensure the path is within baseDir
	absBaseDir, err := filepath.Abs(lfs.baseDir)
	if err != nil {
		return fmt.Errorf("failed to get absolute base directory: %w", err)
	}
	
	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute file path: %w", err)
	}
	
	if !strings.HasPrefix(absFullPath, absBaseDir) {
		return fmt.Errorf("path traversal detected: %s", path)
	}

	// Remove the file
	if err := os.Remove(fullPath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("file not found: %s", path)
		}
		return fmt.Errorf("failed to delete file %s: %w", path, err)
	}

	return nil
}

// FileExists checks if a file exists in the local filesystem
func (lfs *LocalFileStorage) FileExists(path string) (bool, error) {
	if path == "" {
		return false, fmt.Errorf("path cannot be empty")
	}

	// Construct the full path
	fullPath := filepath.Join(lfs.baseDir, path)
	
	// Security check: ensure the path is within baseDir
	absBaseDir, err := filepath.Abs(lfs.baseDir)
	if err != nil {
		return false, fmt.Errorf("failed to get absolute base directory: %w", err)
	}
	
	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return false, fmt.Errorf("failed to get absolute file path: %w", err)
	}
	
	if !strings.HasPrefix(absFullPath, absBaseDir) {
		return false, fmt.Errorf("path traversal detected: %s", path)
	}

	_, err = os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}

	return true, nil
}

// GetFileInfo returns information about a file
func (lfs *LocalFileStorage) GetFileInfo(path string) (*FileInfo, error) {
	if path == "" {
		return nil, fmt.Errorf("path cannot be empty")
	}

	// Construct the full path
	fullPath := filepath.Join(lfs.baseDir, path)
	
	// Security check: ensure the path is within baseDir
	absBaseDir, err := filepath.Abs(lfs.baseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute base directory: %w", err)
	}
	
	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute file path: %w", err)
	}
	
	if !strings.HasPrefix(absFullPath, absBaseDir) {
		return nil, fmt.Errorf("path traversal detected: %s", path)
	}

	// Get file information
	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", path)
		}
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}

	// Determine MIME type from file extension
	mimeType := getMimeTypeFromExtension(filepath.Ext(path))

	return &FileInfo{
		Path:     path,
		Size:     fileInfo.Size(),
		MimeType: mimeType,
	}, nil
}

// getExtensionFromMimeType attempts to determine file extension from MIME type
func getExtensionFromMimeType(mimeType string) string {
	switch mimeType {
	case "text/markdown":
		return ".md"
	case "text/plain":
		return ".txt"
	case "application/json":
		return ".json"
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "application/pdf":
		return ".pdf"
	default:
		return ""
	}
}

// getMimeTypeFromExtension attempts to determine MIME type from file extension
func getMimeTypeFromExtension(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".md", ".markdown":
		return "text/markdown"
	case ".txt":
		return "text/plain"
	case ".json":
		return "application/json"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}
