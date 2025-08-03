package models

import (
	"time"

	"github.com/jinzhu/gorm"
)

// ExtractionStatus represents the status of an extraction session
type ExtractionStatus string

const (
	ExtractionStatusInProgress ExtractionStatus = "in_progress"
	ExtractionStatusCompleted  ExtractionStatus = "completed"
	ExtractionStatusFailed     ExtractionStatus = "failed"
	ExtractionStatusCancelled  ExtractionStatus = "cancelled"
)

// ExtractionURLStatus represents the status of a URL extraction
type ExtractionURLStatus string

const (
	ExtractionURLStatusPending    ExtractionURLStatus = "pending"
	ExtractionURLStatusProcessing ExtractionURLStatus = "processing"
	ExtractionURLStatusSuccess    ExtractionURLStatus = "success"
	ExtractionURLStatusFailed     ExtractionURLStatus = "failed"
	ExtractionURLStatusRetrying   ExtractionURLStatus = "retrying"
	ExtractionURLStatusSkipped    ExtractionURLStatus = "skipped"
)

// ExtractionSession represents a master extraction campaign
type ExtractionSession struct {
	SessionID      string                 `json:"session_id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID         string                 `json:"user_id" gorm:"not null;index"`
	SourceURL      string                 `json:"source_url" gorm:"type:text;not null"`
	SessionName    string                 `json:"session_name"`
	TotalURLs      int                    `json:"total_urls" gorm:"default:0"`
	SuccessfulURLs int                    `json:"successful_urls" gorm:"default:0"`
	FailedURLs     int                    `json:"failed_urls" gorm:"default:0"`
	Status         ExtractionStatus       `json:"status" gorm:"type:extraction_status;default:'in_progress'"`
	StartedAt      time.Time              `json:"started_at" gorm:"not null;default:CURRENT_TIMESTAMP"`
	CompletedAt    *time.Time             `json:"completed_at,omitempty"`
	Metadata       map[string]interface{} `json:"metadata" gorm:"type:jsonb"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`

	// Associations
	URLExtractions []URLExtraction `json:"url_extractions,omitempty" gorm:"foreignkey:SessionID"`
}

// URLExtraction represents individual URL extraction records
type URLExtraction struct {
	ExtractionID    string              `json:"extraction_id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SessionID       string              `json:"session_id" gorm:"type:uuid;not null;index"`
	URL             string              `json:"url" gorm:"type:text;not null"`
	URLHash         string              `json:"url_hash" gorm:"size:64;not null;index"`
	ChunkNumber     int                 `json:"chunk_number" gorm:"not null"`
	PositionInChunk int                 `json:"position_in_chunk" gorm:"not null"`
	Status          ExtractionURLStatus `json:"status" gorm:"type:extraction_url_status;default:'pending'"`
	AttemptCount    int                 `json:"attempt_count" gorm:"default:0"`
	MaxRetries      int                 `json:"max_retries" gorm:"default:3"`

	// Success data
	LinksFound       *int   `json:"links_found,omitempty"`
	ProcessingTimeMs *int   `json:"processing_time_ms,omitempty"`
	HTTPStatus       *int   `json:"http_status,omitempty"`
	FinalURL         string `json:"final_url,omitempty"`

	// Error data
	ErrorType    string     `json:"error_type,omitempty"`
	ErrorMessage string     `json:"error_message,omitempty" gorm:"type:text"`
	LastErrorAt  *time.Time `json:"last_error_at,omitempty"`

	// Metadata
	Metadata map[string]interface{} `json:"metadata" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Associations
	Session ExtractionSession `json:"session,omitempty" gorm:"foreignkey:SessionID"`
	Retries []ExtractionRetry `json:"retries,omitempty" gorm:"foreignkey:ExtractionID"`
}

// ExtractionRetry represents detailed retry history
type ExtractionRetry struct {
	RetryID          string              `json:"retry_id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ExtractionID     string              `json:"extraction_id" gorm:"type:uuid;not null;index"`
	AttemptNumber    int                 `json:"attempt_number" gorm:"not null"`
	Status           ExtractionURLStatus `json:"status" gorm:"type:extraction_url_status;not null"`
	ErrorType        string              `json:"error_type,omitempty"`
	ErrorMessage     string              `json:"error_message,omitempty" gorm:"type:text"`
	ProcessingTimeMs *int                `json:"processing_time_ms,omitempty"`
	HTTPStatus       *int                `json:"http_status,omitempty"`
	RetryStrategy    string              `json:"retry_strategy,omitempty"`
	CreatedAt        time.Time           `json:"created_at"`

	// Association
	URLExtraction URLExtraction `json:"url_extraction,omitempty" gorm:"foreignkey:ExtractionID"`
}

// CreateExtractionSessionRequest represents request to create a new extraction session
type CreateExtractionSessionRequest struct {
	UserID      string                 `json:"user_id" binding:"required"`
	SourceURL   string                 `json:"source_url" binding:"required"`
	SessionName string                 `json:"session_name"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// UpdateExtractionSessionRequest represents request to update an extraction session
type UpdateExtractionSessionRequest struct {
	SessionName    string                 `json:"session_name"`
	TotalURLs      *int                   `json:"total_urls"`
	SuccessfulURLs *int                   `json:"successful_urls"`
	FailedURLs     *int                   `json:"failed_urls"`
	Status         ExtractionStatus       `json:"status"`
	CompletedAt    *time.Time             `json:"completed_at"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// CreateURLExtractionRequest represents request to create URL extractions
type CreateURLExtractionRequest struct {
	SessionID string               `json:"session_id" binding:"required"`
	URLs      []URLExtractionInput `json:"urls" binding:"required"`
}

// URLExtractionInput represents input for creating a URL extraction
type URLExtractionInput struct {
	URL             string                 `json:"url" binding:"required"`
	ChunkNumber     int                    `json:"chunk_number" binding:"required"`
	PositionInChunk int                    `json:"position_in_chunk" binding:"required"`
	MaxRetries      int                    `json:"max_retries"`
	Metadata        map[string]interface{} `json:"metadata"`
}

// UpdateURLExtractionRequest represents request to update a URL extraction
type UpdateURLExtractionRequest struct {
	Status           ExtractionURLStatus    `json:"status"`
	LinksFound       *int                   `json:"links_found"`
	ProcessingTimeMs *int                   `json:"processing_time_ms"`
	HTTPStatus       *int                   `json:"http_status"`
	FinalURL         string                 `json:"final_url"`
	ErrorType        string                 `json:"error_type"`
	ErrorMessage     string                 `json:"error_message"`
	Metadata         map[string]interface{} `json:"metadata"`
}

// ExtractionSessionResponse represents the response format for extraction sessions
type ExtractionSessionResponse struct {
	SessionID       string                  `json:"session_id"`
	UserID          string                  `json:"user_id"`
	SourceURL       string                  `json:"source_url"`
	SessionName     string                  `json:"session_name"`
	TotalURLs       int                     `json:"total_urls"`
	SuccessfulURLs  int                     `json:"successful_urls"`
	FailedURLs      int                     `json:"failed_urls"`
	Status          ExtractionStatus        `json:"status"`
	StartedAt       time.Time               `json:"started_at"`
	CompletedAt     *time.Time              `json:"completed_at,omitempty"`
	DurationSeconds *float64                `json:"duration_seconds,omitempty"`
	SuccessRate     float64                 `json:"success_rate"`
	URLExtractions  []URLExtractionResponse `json:"url_extractions,omitempty"`
	Statistics      ExtractionStatistics    `json:"statistics"`
	Metadata        map[string]interface{}  `json:"metadata"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

// URLExtractionResponse represents the response format for URL extractions
type URLExtractionResponse struct {
	ExtractionID     string                    `json:"extraction_id"`
	SessionID        string                    `json:"session_id"`
	URL              string                    `json:"url"`
	ChunkNumber      int                       `json:"chunk_number"`
	PositionInChunk  int                       `json:"position_in_chunk"`
	Status           ExtractionURLStatus       `json:"status"`
	AttemptCount     int                       `json:"attempt_count"`
	MaxRetries       int                       `json:"max_retries"`
	RemainingRetries int                       `json:"remaining_retries"`
	LinksFound       *int                      `json:"links_found,omitempty"`
	ProcessingTimeMs *int                      `json:"processing_time_ms,omitempty"`
	HTTPStatus       *int                      `json:"http_status,omitempty"`
	FinalURL         string                    `json:"final_url,omitempty"`
	ErrorType        string                    `json:"error_type,omitempty"`
	ErrorMessage     string                    `json:"error_message,omitempty"`
	LastErrorAt      *time.Time                `json:"last_error_at,omitempty"`
	Retries          []ExtractionRetryResponse `json:"retries,omitempty"`
	Metadata         map[string]interface{}    `json:"metadata"`
	CreatedAt        time.Time                 `json:"created_at"`
	UpdatedAt        time.Time                 `json:"updated_at"`
}

// ExtractionRetryResponse represents the response format for extraction retries
type ExtractionRetryResponse struct {
	RetryID          string              `json:"retry_id"`
	ExtractionID     string              `json:"extraction_id"`
	AttemptNumber    int                 `json:"attempt_number"`
	Status           ExtractionURLStatus `json:"status"`
	ErrorType        string              `json:"error_type,omitempty"`
	ErrorMessage     string              `json:"error_message,omitempty"`
	ProcessingTimeMs *int                `json:"processing_time_ms,omitempty"`
	HTTPStatus       *int                `json:"http_status,omitempty"`
	RetryStrategy    string              `json:"retry_strategy,omitempty"`
	CreatedAt        time.Time           `json:"created_at"`
}

// ExtractionStatistics represents extraction session statistics
type ExtractionStatistics struct {
	ChunksProcessed       int            `json:"chunks_processed"`
	TotalRetries          int            `json:"total_retries"`
	AverageProcessingTime float64        `json:"average_processing_time_ms"`
	ErrorBreakdown        map[string]int `json:"error_breakdown"`
}

// ToResponse converts an ExtractionSession to ExtractionSessionResponse
func (es *ExtractionSession) ToResponse(includeURLs bool) ExtractionSessionResponse {
	response := ExtractionSessionResponse{
		SessionID:      es.SessionID,
		UserID:         es.UserID,
		SourceURL:      es.SourceURL,
		SessionName:    es.SessionName,
		TotalURLs:      es.TotalURLs,
		SuccessfulURLs: es.SuccessfulURLs,
		FailedURLs:     es.FailedURLs,
		Status:         es.Status,
		StartedAt:      es.StartedAt,
		CompletedAt:    es.CompletedAt,
		Metadata:       es.Metadata,
		CreatedAt:      es.CreatedAt,
		UpdatedAt:      es.UpdatedAt,
	}

	// Calculate success rate
	if es.TotalURLs > 0 {
		response.SuccessRate = float64(es.SuccessfulURLs) / float64(es.TotalURLs) * 100
	}

	// Calculate duration
	endTime := time.Now()
	if es.CompletedAt != nil {
		endTime = *es.CompletedAt
	}
	duration := endTime.Sub(es.StartedAt).Seconds()
	response.DurationSeconds = &duration

	if includeURLs {
		response.URLExtractions = make([]URLExtractionResponse, len(es.URLExtractions))
		for i, url := range es.URLExtractions {
			response.URLExtractions[i] = url.ToResponse(false)
		}
	}

	response.Statistics = es.CalculateStatistics()

	return response
}

// ToResponse converts a URLExtraction to URLExtractionResponse
func (ue *URLExtraction) ToResponse(includeRetries bool) URLExtractionResponse {
	response := URLExtractionResponse{
		ExtractionID:     ue.ExtractionID,
		SessionID:        ue.SessionID,
		URL:              ue.URL,
		ChunkNumber:      ue.ChunkNumber,
		PositionInChunk:  ue.PositionInChunk,
		Status:           ue.Status,
		AttemptCount:     ue.AttemptCount,
		MaxRetries:       ue.MaxRetries,
		RemainingRetries: ue.MaxRetries - ue.AttemptCount,
		LinksFound:       ue.LinksFound,
		ProcessingTimeMs: ue.ProcessingTimeMs,
		HTTPStatus:       ue.HTTPStatus,
		FinalURL:         ue.FinalURL,
		ErrorType:        ue.ErrorType,
		ErrorMessage:     ue.ErrorMessage,
		LastErrorAt:      ue.LastErrorAt,
		Metadata:         ue.Metadata,
		CreatedAt:        ue.CreatedAt,
		UpdatedAt:        ue.UpdatedAt,
	}

	if includeRetries {
		response.Retries = make([]ExtractionRetryResponse, len(ue.Retries))
		for i, retry := range ue.Retries {
			response.Retries[i] = retry.ToResponse()
		}
	}

	return response
}

// ToResponse converts an ExtractionRetry to ExtractionRetryResponse
func (er *ExtractionRetry) ToResponse() ExtractionRetryResponse {
	return ExtractionRetryResponse{
		RetryID:          er.RetryID,
		ExtractionID:     er.ExtractionID,
		AttemptNumber:    er.AttemptNumber,
		Status:           er.Status,
		ErrorType:        er.ErrorType,
		ErrorMessage:     er.ErrorMessage,
		ProcessingTimeMs: er.ProcessingTimeMs,
		HTTPStatus:       er.HTTPStatus,
		RetryStrategy:    er.RetryStrategy,
		CreatedAt:        er.CreatedAt,
	}
}

// CalculateStatistics calculates session statistics
func (es *ExtractionSession) CalculateStatistics() ExtractionStatistics {
	stats := ExtractionStatistics{
		ErrorBreakdown: make(map[string]int),
	}

	chunkMap := make(map[int]bool)
	totalRetries := 0
	totalProcessingTime := 0
	processedCount := 0

	for _, url := range es.URLExtractions {
		chunkMap[url.ChunkNumber] = true
		totalRetries += len(url.Retries)

		if url.ProcessingTimeMs != nil {
			totalProcessingTime += *url.ProcessingTimeMs
			processedCount++
		}

		if url.ErrorType != "" {
			stats.ErrorBreakdown[url.ErrorType]++
		}
	}

	stats.ChunksProcessed = len(chunkMap)
	stats.TotalRetries = totalRetries

	if processedCount > 0 {
		stats.AverageProcessingTime = float64(totalProcessingTime) / float64(processedCount)
	}

	return stats
}

// BeforeCreate sets default values before creating extraction session
func (es *ExtractionSession) BeforeCreate(scope *gorm.Scope) error {
	if es.Metadata == nil {
		es.Metadata = make(map[string]interface{})
	}
	return nil
}

// BeforeCreate sets default values before creating URL extraction
func (ue *URLExtraction) BeforeCreate(scope *gorm.Scope) error {
	if ue.Metadata == nil {
		ue.Metadata = make(map[string]interface{})
	}
	if ue.MaxRetries == 0 {
		ue.MaxRetries = 3
	}
	// Generate URL hash if not provided
	if ue.URLHash == "" {
		// This would call a hash function - simplified for now
		ue.URLHash = "hash_" + ue.URL[:10] // Simplified implementation
	}
	return nil
}

// TableName sets the table name for ExtractionSession
func (ExtractionSession) TableName() string {
	return "extraction_sessions"
}

// TableName sets the table name for URLExtraction
func (URLExtraction) TableName() string {
	return "url_extractions"
}

// TableName sets the table name for ExtractionRetry
func (ExtractionRetry) TableName() string {
	return "extraction_retries"
}
