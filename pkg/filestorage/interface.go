package filestorage

import (
	"io"
)

// FileStorageService defines the interface for file storage operations
// This interface abstracts file storage to support both local filesystem
// and cloud storage (like S3) implementations
type FileStorageService interface {
	// UploadFile uploads a file and returns the unique relative path
	// Parameters:
	//   - file: io.Reader containing the file content
	//   - filename: original filename (used for extension detection)
	//   - mimeType: MIME type of the file
	// Returns:
	//   - string: unique relative path where the file was stored
	//   - error: any error that occurred during upload
	UploadFile(file io.Reader, filename string, mimeType string) (string, error)

	// GetFile retrieves a file by its relative path
	// Parameters:
	//   - path: relative path of the file (as returned by UploadFile)
	// Returns:
	//   - io.Reader: file content reader (caller must close it)
	//   - error: any error that occurred during retrieval
	GetFile(path string) (io.Reader, error)

	// DeleteFile removes a file by its relative path
	// Parameters:
	//   - path: relative path of the file to delete
	// Returns:
	//   - error: any error that occurred during deletion
	DeleteFile(path string) error

	// FileExists checks if a file exists at the given relative path
	// Parameters:
	//   - path: relative path of the file to check
	// Returns:
	//   - bool: true if file exists, false otherwise
	//   - error: any error that occurred during the check
	FileExists(path string) (bool, error)

	// GetFileInfo returns information about a file
	// Parameters:
	//   - path: relative path of the file
	// Returns:
	//   - FileInfo: file information struct
	//   - error: any error that occurred during retrieval
	GetFileInfo(path string) (*FileInfo, error)
}

// FileInfo contains metadata about a stored file
type FileInfo struct {
	Path     string `json:"path"`     // Relative path of the file
	Size     int64  `json:"size"`     // File size in bytes
	MimeType string `json:"mimeType"` // MIME type of the file
	// Add more fields as needed (e.g., CreatedAt, ModifiedAt, etc.)
}
