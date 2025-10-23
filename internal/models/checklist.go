package models

import (
	"time"
)

// Checklist represents a travel checklist
type Checklist struct {
	ID          string                 `json:"id" redis:"id"`
	Name        string                 `json:"name" redis:"name"`
	Type        string                 `json:"type" redis:"type"`
	Duration    string                 `json:"duration" redis:"duration"`
	Items       map[string][]string    `json:"items" redis:"items"`
	Completed   map[string]map[string]bool `json:"completed" redis:"completed"`
	CreatedAt   time.Time              `json:"createdAt" redis:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt" redis:"updatedAt"`
}

// ChecklistRequest represents the request payload for creating/updating a checklist
type ChecklistRequest struct {
	Name      string                 `json:"name"`
	Type      string                 `json:"type"`
	Duration  string                 `json:"duration"`
	Items     map[string][]string    `json:"items"`
	Completed map[string]map[string]bool `json:"completed"`
}

// ChecklistResponse represents the response for checklist operations
type ChecklistResponse struct {
	Success bool       `json:"success"`
	Message string     `json:"message,omitempty"`
	Data    *Checklist `json:"data,omitempty"`
}

// ChecklistListResponse represents the response for checklist list operations
type ChecklistListResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message,omitempty"`
	Data    []Checklist  `json:"data,omitempty"`
}
