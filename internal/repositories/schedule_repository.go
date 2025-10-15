package repositories

import (
	"tripflow/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ScheduleRepository defines the interface for schedule data operations
type ScheduleRepository interface {
	// Create creates a new schedule
	Create(schedule *models.Schedule) error

	// GetByID retrieves a schedule by its ID
	GetByID(id uuid.UUID) (*models.Schedule, error)

	// GetByUserID retrieves all schedules for a specific user
	GetByUserID(userID uuid.UUID) ([]*models.Schedule, error)

	// GetPublic retrieves all public schedules
	GetPublic() ([]*models.Schedule, error)

	// List retrieves schedules with pagination and filtering
	List(offset, limit int, isPublic *bool) ([]*models.Schedule, int64, error)

	// Update updates an existing schedule
	Update(schedule *models.Schedule) error

	// Delete removes a schedule by ID
	Delete(id uuid.UUID) error

	// GetByFileID retrieves a schedule by its associated file ID
	GetByFileID(fileID uuid.UUID) (*models.Schedule, error)
}

// GORMScheduleRepository implements ScheduleRepository using GORM
type GORMScheduleRepository struct {
	db *gorm.DB
}

// NewScheduleRepository creates a new GORM-based schedule repository
func NewScheduleRepository(db *gorm.DB) ScheduleRepository {
	return &GORMScheduleRepository{
		db: db,
	}
}

// Create creates a new schedule
func (r *GORMScheduleRepository) Create(schedule *models.Schedule) error {
	return r.db.Create(schedule).Error
}

// GetByID retrieves a schedule by its ID
func (r *GORMScheduleRepository) GetByID(id uuid.UUID) (*models.Schedule, error) {
	var schedule models.Schedule
	err := r.db.Preload("File").Where("id = ?", id).First(&schedule).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}

// GetByUserID retrieves all schedules for a specific user
func (r *GORMScheduleRepository) GetByUserID(userID uuid.UUID) ([]*models.Schedule, error) {
	var schedules []*models.Schedule
	err := r.db.Preload("File").Where("user_id = ?", userID).Find(&schedules).Error
	if err != nil {
		return nil, err
	}
	return schedules, nil
}

// GetPublic retrieves all public schedules
func (r *GORMScheduleRepository) GetPublic() ([]*models.Schedule, error) {
	var schedules []*models.Schedule
	err := r.db.Preload("File").Where("is_public = ?", true).Find(&schedules).Error
	if err != nil {
		return nil, err
	}
	return schedules, nil
}

// List retrieves schedules with pagination and filtering
func (r *GORMScheduleRepository) List(offset, limit int, isPublic *bool) ([]*models.Schedule, int64, error) {
	var schedules []*models.Schedule
	var total int64

	query := r.db.Model(&models.Schedule{})
	
	// Apply public filter if specified
	if isPublic != nil {
		query = query.Where("is_public = ?", *isPublic)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Preload("File").Offset(offset).Limit(limit).Find(&schedules).Error
	if err != nil {
		return nil, 0, err
	}

	return schedules, total, nil
}

// Update updates an existing schedule
func (r *GORMScheduleRepository) Update(schedule *models.Schedule) error {
	return r.db.Save(schedule).Error
}

// Delete removes a schedule by ID
func (r *GORMScheduleRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Schedule{}, "id = ?", id).Error
}

// GetByFileID retrieves a schedule by its associated file ID
func (r *GORMScheduleRepository) GetByFileID(fileID uuid.UUID) (*models.Schedule, error) {
	var schedule models.Schedule
	err := r.db.Preload("File").Where("file_id = ?", fileID).First(&schedule).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}
