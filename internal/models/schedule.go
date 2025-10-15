package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Schedule represents a travel schedule
type Schedule struct {
	ID          uuid.UUID `gorm:"primaryKey;type:text" json:"id"`
	UserID      uuid.UUID `gorm:"type:text;not null" json:"user_id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	Content     string    `gorm:"type:text" json:"content"`
	IsPublic    bool      `gorm:"default:false;not null" json:"is_public"`
	FileID      uuid.UUID `gorm:"type:text;not null" json:"file_id"`
	ShareCount  int       `gorm:"default:0" json:"share_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	
	// Relationships
	File *File `gorm:"foreignKey:FileID;references:ID" json:"file,omitempty"`
}

// TableName returns the table name for the Schedule model
func (Schedule) TableName() string {
	return "schedules"
}

// BeforeCreate hook to generate UUID if not set
func (s *Schedule) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// NewSchedule creates a new Schedule instance with generated UUID
func NewSchedule(userID, fileID uuid.UUID, title, description, content string, isPublic bool) *Schedule {
	return &Schedule{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       title,
		Description: description,
		Content:     content,
		IsPublic:    isPublic,
		FileID:      fileID,
		ShareCount:  0,
	}
}

// IncrementShareCount increments the share count for the schedule
func (s *Schedule) IncrementShareCount() {
	s.ShareCount++
}

// IsOwnedBy checks if the schedule is owned by the given user
func (s *Schedule) IsOwnedBy(userID uuid.UUID) bool {
	return s.UserID == userID
}
