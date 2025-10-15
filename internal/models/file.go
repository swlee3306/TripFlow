package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// File represents a file uploaded to the system
type File struct {
	ID         uuid.UUID `gorm:"primaryKey;type:text" json:"id"`
	UserID     uuid.UUID `gorm:"type:text;not null" json:"user_id"`
	Filename   string    `gorm:"not null" json:"filename"`
	FilePath   string    `gorm:"not null" json:"file_path"`
	FileSize   int64     `gorm:"not null" json:"file_size"`
	MimeType   string    `json:"mime_type"`
	UploadDate time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"upload_date"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName returns the table name for the File model
func (File) TableName() string {
	return "files"
}

// BeforeCreate hook to generate UUID if not set
func (f *File) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

// NewFile creates a new File instance with generated UUID
func NewFile(userID uuid.UUID, filename, filePath string, fileSize int64, mimeType string) *File {
	return &File{
		ID:         uuid.New(),
		UserID:     userID,
		Filename:   filename,
		FilePath:   filePath,
		FileSize:   fileSize,
		MimeType:   mimeType,
		UploadDate: time.Now(),
	}
}
