package filestorage

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewLocalFileStorage(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	tests := []struct {
		name        string
		basePath    string
		expectError bool
	}{
		{
			name:        "Valid base path",
			basePath:    tempDir,
			expectError: false,
		},
		{
			name:        "Empty base path",
			basePath:    "",
			expectError: true,
		},
		{
			name:        "Non-existent directory (should be created)",
			basePath:    filepath.Join(tempDir, "new-dir"),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			storage, err := NewLocalFileStorage(tt.basePath)
			
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}
			
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}
			
			if storage == nil {
				t.Errorf("Expected storage instance but got nil")
			}
		})
	}
}

func TestLocalFileStorage_UploadFile(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	tests := []struct {
		name        string
		content     string
		filename    string
		mimeType    string
		expectError bool
	}{
		{
			name:        "Valid markdown file",
			content:     "# Test Document\n\nThis is a test.",
			filename:    "test.md",
			mimeType:    "text/markdown",
			expectError: false,
		},
		{
			name:        "Valid text file",
			content:     "Hello, World!",
			filename:    "hello.txt",
			mimeType:    "text/plain",
			expectError: false,
		},
		{
			name:        "Empty content",
			content:     "",
			filename:    "empty.txt",
			mimeType:    "text/plain",
			expectError: true,
		},
		{
			name:        "Nil reader",
			content:     "",
			filename:    "test.txt",
			mimeType:    "text/plain",
			expectError: true,
		},
		{
			name:        "Empty filename",
			content:     "content",
			filename:    "",
			mimeType:    "text/plain",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var reader io.Reader
			if tt.content == "" && tt.name != "Nil reader" {
				reader = strings.NewReader(tt.content)
			} else if tt.name != "Nil reader" {
				reader = strings.NewReader(tt.content)
			}

			path, err := storage.UploadFile(reader, tt.filename, tt.mimeType)
			
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}
			
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}
			
			if path == "" {
				t.Errorf("Expected non-empty path but got empty")
			}
			
			// Verify the file exists
			exists, err := storage.FileExists(path)
			if err != nil {
				t.Errorf("Failed to check file existence: %v", err)
			}
			if !exists {
				t.Errorf("Uploaded file does not exist at path: %s", path)
			}
		})
	}
}

func TestLocalFileStorage_GetFile(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Upload a test file first
	testContent := "# Test Document\n\nThis is a test markdown file."
	reader := strings.NewReader(testContent)
	path, err := storage.UploadFile(reader, "test.md", "text/markdown")
	if err != nil {
		t.Fatalf("Failed to upload test file: %v", err)
	}

	tests := []struct {
		name        string
		filePath    string
		expectError bool
	}{
		{
			name:        "Valid file path",
			filePath:    path,
			expectError: false,
		},
		{
			name:        "Non-existent file",
			filePath:    "non-existent/file.txt",
			expectError: true,
		},
		{
			name:        "Empty path",
			filePath:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fileReader, err := storage.GetFile(tt.filePath)
			
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}
			
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}
			
			if fileReader == nil {
				t.Errorf("Expected file reader but got nil")
				return
			}
			
			// For valid file, check content
			if tt.name == "Valid file path" {
				content, err := io.ReadAll(fileReader)
				if err != nil {
					t.Errorf("Failed to read file content: %v", err)
				}
				if string(content) != testContent {
					t.Errorf("File content mismatch. Expected: %s, Got: %s", testContent, string(content))
				}
			}
			
			// Close the reader
			if closer, ok := fileReader.(io.Closer); ok {
				closer.Close()
			}
		})
	}
}

func TestLocalFileStorage_DeleteFile(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Upload a test file first
	testContent := "Test content for deletion"
	reader := strings.NewReader(testContent)
	path, err := storage.UploadFile(reader, "test.txt", "text/plain")
	if err != nil {
		t.Fatalf("Failed to upload test file: %v", err)
	}

	// Verify file exists
	exists, err := storage.FileExists(path)
	if err != nil {
		t.Fatalf("Failed to check file existence: %v", err)
	}
	if !exists {
		t.Fatalf("Test file should exist before deletion")
	}

	// Delete the file
	err = storage.DeleteFile(path)
	if err != nil {
		t.Errorf("Failed to delete file: %v", err)
	}

	// Verify file no longer exists
	exists, err = storage.FileExists(path)
	if err != nil {
		t.Errorf("Failed to check file existence after deletion: %v", err)
	}
	if exists {
		t.Errorf("File should not exist after deletion")
	}

	// Try to delete non-existent file
	err = storage.DeleteFile("non-existent/file.txt")
	if err == nil {
		t.Errorf("Expected error when deleting non-existent file")
	}
}

func TestLocalFileStorage_FileExists(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Upload a test file
	testContent := "Test content"
	reader := strings.NewReader(testContent)
	path, err := storage.UploadFile(reader, "test.txt", "text/plain")
	if err != nil {
		t.Fatalf("Failed to upload test file: %v", err)
	}

	tests := []struct {
		name     string
		filePath string
		expected bool
	}{
		{
			name:     "Existing file",
			filePath: path,
			expected: true,
		},
		{
			name:     "Non-existent file",
			filePath: "non-existent/file.txt",
			expected: false,
		},
		{
			name:     "Empty path",
			filePath: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists, err := storage.FileExists(tt.filePath)
			if tt.filePath == "" {
				// Empty path should return an error
				if err == nil {
					t.Errorf("Expected error for empty path but got none")
				}
				return
			}
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}
			if exists != tt.expected {
				t.Errorf("FileExists() = %v, expected %v", exists, tt.expected)
			}
		})
	}
}

func TestLocalFileStorage_GetFileInfo(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Upload a test file
	testContent := "# Test Markdown\n\nThis is a test."
	reader := strings.NewReader(testContent)
	path, err := storage.UploadFile(reader, "test.md", "text/markdown")
	if err != nil {
		t.Fatalf("Failed to upload test file: %v", err)
	}

	// Get file info
	info, err := storage.GetFileInfo(path)
	if err != nil {
		t.Errorf("Failed to get file info: %v", err)
		return
	}

	if info.Path != path {
		t.Errorf("Expected path %s, got %s", path, info.Path)
	}

	if info.Size != int64(len(testContent)) {
		t.Errorf("Expected size %d, got %d", len(testContent), info.Size)
	}

	if info.MimeType != "text/markdown" {
		t.Errorf("Expected MIME type text/markdown, got %s", info.MimeType)
	}
}

func TestLocalFileStorage_PathTraversalSecurity(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "tripflow-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalFileStorage(tempDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Test path traversal attacks
	maliciousPaths := []string{
		"../../../etc/passwd",
		"uploads/../../../etc/passwd",
	}

	for _, maliciousPath := range maliciousPaths {
		t.Run("PathTraversal_"+maliciousPath, func(t *testing.T) {
			// Test GetFile with malicious path
			_, err := storage.GetFile(maliciousPath)
			if err == nil {
				t.Errorf("Expected path traversal error for GetFile with path: %s", maliciousPath)
			}

			// Test DeleteFile with malicious path
			err = storage.DeleteFile(maliciousPath)
			if err == nil {
				t.Errorf("Expected path traversal error for DeleteFile with path: %s", maliciousPath)
			}

			// Test FileExists with malicious path
			_, err = storage.FileExists(maliciousPath)
			if err == nil {
				t.Errorf("Expected path traversal error for FileExists with path: %s", maliciousPath)
			}

			// Test GetFileInfo with malicious path
			_, err = storage.GetFileInfo(maliciousPath)
			if err == nil {
				t.Errorf("Expected path traversal error for GetFileInfo with path: %s", maliciousPath)
			}
		})
	}
}

func TestDefaultConfig(t *testing.T) {
	// Save original environment
	originalVercel := os.Getenv("VERCEL")
	originalBaseDir := os.Getenv("FILE_STORAGE_BASE_DIR")
	
	// Clean up after test
	defer func() {
		os.Setenv("VERCEL", originalVercel)
		os.Setenv("FILE_STORAGE_BASE_DIR", originalBaseDir)
	}()

	tests := []struct {
		name     string
		vercel   string
		baseDir  string
		expected string
	}{
		{
			name:     "Vercel environment",
			vercel:   "1",
			baseDir:  "",
			expected: "/tmp",
		},
		{
			name:     "Local environment with custom base dir",
			vercel:   "",
			baseDir:  "/custom/path",
			expected: "/custom/path",
		},
		{
			name:     "Local environment without custom base dir",
			vercel:   "",
			baseDir:  "",
			expected: "", // Will be set to temp dir, we'll check it contains "tripflow-files"
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variables
			os.Setenv("VERCEL", tt.vercel)
			os.Setenv("FILE_STORAGE_BASE_DIR", tt.baseDir)
			
			config := DefaultConfig()
			
			if tt.expected == "" {
				// For local environment, check it contains "tripflow-files"
				if !strings.Contains(config.BaseDir, "tripflow-files") {
					t.Errorf("Expected base dir to contain 'tripflow-files', got: %s", config.BaseDir)
				}
			} else {
				if config.BaseDir != tt.expected {
					t.Errorf("Expected base dir %s, got %s", tt.expected, config.BaseDir)
				}
			}
		})
	}
}
