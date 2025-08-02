package models

import (
	"time"

	"github.com/jinzhu/gorm"
)

// ChartDataPoint represents a single data point for charts
type ChartDataPoint struct {
	ID        uint      `json:"id" gorm:"primary_key"`
	X         float64   `json:"x" gorm:"not null"`
	Y         float64   `json:"y" gorm:"not null"`
	Label     string    `json:"label,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	DatasetID uint      `json:"dataset_id" gorm:"index"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Dataset represents a collection of data points
type Dataset struct {
	ID          uint              `json:"id" gorm:"primary_key"`
	Name        string            `json:"name" gorm:"not null;index"`
	Description string            `json:"description"`
	Type        string            `json:"type" gorm:"not null"` // 'stock', 'analytics', 'performance', etc.
	Source      string            `json:"source"`               // Data source identifier
	Metadata    map[string]string `json:"metadata" gorm:"type:jsonb"`
	DataPoints  []ChartDataPoint  `json:"data_points,omitempty" gorm:"foreignkey:DatasetID"`
	IsPublic    bool              `json:"is_public" gorm:"default:true"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// CreateDatasetRequest represents request to create a new dataset
type CreateDatasetRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description"`
	Type        string            `json:"type" binding:"required"`
	Source      string            `json:"source"`
	Metadata    map[string]string `json:"metadata"`
	IsPublic    bool              `json:"is_public"`
}

// UpdateDatasetRequest represents request to update a dataset
type UpdateDatasetRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Metadata    map[string]string `json:"metadata"`
	IsPublic    *bool             `json:"is_public"`
}

// AddDataPointsRequest represents request to add data points to a dataset
type AddDataPointsRequest struct {
	DataPoints []ChartDataPointInput `json:"data_points" binding:"required"`
}

// ChartDataPointInput represents input for creating a data point
type ChartDataPointInput struct {
	X         float64    `json:"x" binding:"required"`
	Y         float64    `json:"y" binding:"required"`
	Label     string     `json:"label"`
	Timestamp *time.Time `json:"timestamp"`
}

// DatasetResponse represents the response format for datasets
type DatasetResponse struct {
	ID          uint                     `json:"id"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	Type        string                   `json:"type"`
	Source      string                   `json:"source"`
	Metadata    map[string]string        `json:"metadata"`
	DataPoints  []ChartDataPointResponse `json:"data_points,omitempty"`
	IsPublic    bool                     `json:"is_public"`
	PointCount  int                      `json:"point_count"`
	CreatedAt   time.Time                `json:"created_at"`
	UpdatedAt   time.Time                `json:"updated_at"`
}

// ChartDataPointResponse represents the response format for data points
type ChartDataPointResponse struct {
	ID        uint      `json:"id"`
	X         float64   `json:"x"`
	Y         float64   `json:"y"`
	Label     string    `json:"label,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ToResponse converts a Dataset to DatasetResponse
func (d *Dataset) ToResponse(includeDataPoints bool) DatasetResponse {
	response := DatasetResponse{
		ID:          d.ID,
		Name:        d.Name,
		Description: d.Description,
		Type:        d.Type,
		Source:      d.Source,
		Metadata:    d.Metadata,
		IsPublic:    d.IsPublic,
		PointCount:  len(d.DataPoints),
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}

	if includeDataPoints {
		response.DataPoints = make([]ChartDataPointResponse, len(d.DataPoints))
		for i, point := range d.DataPoints {
			response.DataPoints[i] = ChartDataPointResponse{
				ID:        point.ID,
				X:         point.X,
				Y:         point.Y,
				Label:     point.Label,
				Timestamp: point.Timestamp,
				CreatedAt: point.CreatedAt,
			}
		}
	}

	return response
}

// BeforeCreate sets default values before creating
func (d *Dataset) BeforeCreate(scope *gorm.Scope) error {
	if d.Metadata == nil {
		d.Metadata = make(map[string]string)
	}
	return nil
}