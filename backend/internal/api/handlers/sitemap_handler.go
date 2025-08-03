package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/config"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/models"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/services"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

// SitemapHandler handles sitemap and extraction related requests
type SitemapHandler struct {
	db              *storage.Database
	firecrawlClient *services.FirecrawlClient
	cfg             *config.Config
}

// NewSitemapHandler creates a new sitemap handler
func NewSitemapHandler(db *storage.Database, cfg *config.Config) *SitemapHandler {
	return &SitemapHandler{
		db:              db,
		firecrawlClient: services.NewFirecrawlClient(cfg),
		cfg:             cfg,
	}
}

// DiscoverSitemap discovers URLs from a website's sitemap
func (h *SitemapHandler) DiscoverSitemap(c *gin.Context) {
	var req struct {
		BaseURL string `json:"base_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Call firecrawl service to discover sitemap URLs
	discovery, err := h.firecrawlClient.DiscoverSitemap(c.Request.Context(), req.BaseURL)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "Failed to discover sitemap",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    discovery,
	})
}

// StartBatchExtraction starts a batch extraction process
func (h *SitemapHandler) StartBatchExtraction(c *gin.Context) {
	var req struct {
		UserID      string   `json:"user_id" binding:"required"`
		SourceURL   string   `json:"source_url" binding:"required"`
		SessionName string   `json:"session_name"`
		URLs        []string `json:"urls" binding:"required"`
		ChunkSize   int      `json:"chunk_size"`
		MaxRetries  int      `json:"max_retries"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set defaults
	if req.ChunkSize == 0 {
		req.ChunkSize = 10
	}
	if req.MaxRetries == 0 {
		req.MaxRetries = 3
	}

	// Create extraction session in database (let DB generate UUID)
	session := &models.ExtractionSession{
		UserID:      req.UserID,
		SourceURL:   req.SourceURL,
		SessionName: req.SessionName,
		TotalURLs:   len(req.URLs),
		Status:      models.ExtractionStatusInProgress,
		StartedAt:   time.Now(),
		Metadata: map[string]interface{}{
			"chunk_size":   req.ChunkSize,
			"max_retries":  req.MaxRetries,
			"request_time": time.Now().Unix(),
		},
	}

	if err := h.db.DB.Create(session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create extraction session",
			"details": err.Error(),
		})
		return
	}

	// Get the generated session ID
	sessionID := session.SessionID

	// Create URL extraction records
	urlExtractions := make([]models.URLExtraction, 0, len(req.URLs))
	for i, url := range req.URLs {
		chunkNumber := i / req.ChunkSize
		positionInChunk := i % req.ChunkSize

		urlExtraction := models.URLExtraction{
			SessionID:       sessionID,
			URL:             url,
			URLHash:         generateURLHash(url),
			ChunkNumber:     chunkNumber,
			PositionInChunk: positionInChunk,
			Status:          models.ExtractionURLStatusPending,
			MaxRetries:      req.MaxRetries,
			Metadata: map[string]interface{}{
				"original_index": i,
			},
		}
		urlExtractions = append(urlExtractions, urlExtraction)
	}

	if err := h.db.DB.Create(&urlExtractions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create URL extraction records",
			"details": err.Error(),
		})
		return
	}

	// Start batch extraction with firecrawl service
	extractionResponse, err := h.firecrawlClient.StartBatchExtraction(
		c.Request.Context(),
		sessionID,
		req.URLs,
		req.ChunkSize,
		req.MaxRetries,
	)
	if err != nil {
		// Update session status to failed
		h.db.DB.Model(session).Updates(map[string]interface{}{
			"status":       models.ExtractionStatusFailed,
			"completed_at": time.Now(),
		})

		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "Failed to start batch extraction",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"session_id": sessionID,
			"status":     extractionResponse.Status,
			"total_urls": extractionResponse.TotalURLs,
			"message":    extractionResponse.Message,
		},
	})
}

// GetExtractionProgress gets the progress of an extraction session
func (h *SitemapHandler) GetExtractionProgress(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "session_id is required",
		})
		return
	}

	// Get session from database
	var session models.ExtractionSession
	if err := h.db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Extraction session not found",
		})
		return
	}

	// Get progress from firecrawl service
	progress, err := h.firecrawlClient.GetExtractionProgress(c.Request.Context(), sessionID)
	if err != nil {
		// Fall back to database progress if firecrawl service is unavailable
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"session_id":       session.SessionID,
				"status":           session.Status,
				"total_urls":       session.TotalURLs,
				"successful_urls":  session.SuccessfulURLs,
				"failed_urls":      session.FailedURLs,
				"progress_percent": calculateProgressPercent(session.SuccessfulURLs+session.FailedURLs, session.TotalURLs),
				"source":           "database",
			},
		})
		return
	}

	// Update session with latest progress
	h.db.DB.Model(&session).Updates(map[string]interface{}{
		"successful_urls": progress.SuccessfulURLs,
		"failed_urls":     progress.FailedURLs,
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    progress,
	})
}

// GetExtractionHistory gets the extraction history for a user
func (h *SitemapHandler) GetExtractionHistory(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "user_id query parameter is required",
		})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := (page - 1) * limit

	// Get sessions from database
	var sessions []models.ExtractionSession
	var total int64

	// Count total sessions
	h.db.DB.Model(&models.ExtractionSession{}).Where("user_id = ?", userID).Count(&total)

	// Get sessions with pagination
	query := h.db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit)

	if err := query.Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve extraction history",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	responses := make([]models.ExtractionSessionResponse, len(sessions))
	for i, session := range sessions {
		responses[i] = session.ToResponse(false)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"sessions": responses,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetExtractionDetails gets detailed information about a specific extraction session
func (h *SitemapHandler) GetExtractionDetails(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "session_id is required",
		})
		return
	}

	includeURLs := c.Query("include_urls") == "true"

	// Get session from database
	var session models.ExtractionSession
	query := h.db.DB.Where("session_id = ?", sessionID)

	if includeURLs {
		query = query.Preload("URLExtractions")
	}

	if err := query.First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Extraction session not found",
		})
		return
	}

	response := session.ToResponse(includeURLs)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// CancelExtraction cancels an ongoing extraction session
func (h *SitemapHandler) CancelExtraction(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "session_id is required",
		})
		return
	}

	// Check if session exists and is cancellable
	var session models.ExtractionSession
	if err := h.db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Extraction session not found",
		})
		return
	}

	if session.Status != models.ExtractionStatusInProgress {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Only in-progress extractions can be cancelled",
		})
		return
	}

	// Cancel with firecrawl service
	if err := h.firecrawlClient.CancelExtraction(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "Failed to cancel extraction with firecrawl service",
			"details": err.Error(),
		})
		return
	}

	// Update session status in database
	now := time.Now()
	if err := h.db.DB.Model(&session).Updates(map[string]interface{}{
		"status":       models.ExtractionStatusCancelled,
		"completed_at": &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update session status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Extraction cancelled successfully",
	})
}

// RetryFailedExtractions retries failed extractions in a session
func (h *SitemapHandler) RetryFailedExtractions(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "session_id is required",
		})
		return
	}

	// Check if session exists
	var session models.ExtractionSession
	if err := h.db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Extraction session not found",
		})
		return
	}

	// Retry with firecrawl service
	retryResponse, err := h.firecrawlClient.RetryFailedExtractions(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "Failed to retry failed extractions",
			"details": err.Error(),
		})
		return
	}

	// Update session status if it was completed/failed
	if session.Status != models.ExtractionStatusInProgress {
		h.db.DB.Model(&session).Updates(map[string]interface{}{
			"status":       models.ExtractionStatusInProgress,
			"completed_at": nil,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    retryResponse,
	})
}

// DeleteExtractionSession deletes an extraction session and its data
func (h *SitemapHandler) DeleteExtractionSession(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "session_id is required",
		})
		return
	}

	// Check if session exists
	var session models.ExtractionSession
	if err := h.db.DB.Where("session_id = ?", sessionID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Extraction session not found",
		})
		return
	}

	// Delete session and related data (cascading delete should handle URL extractions and retries)
	if err := h.db.DB.Where("session_id = ?", sessionID).Delete(&models.ExtractionSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete extraction session",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Extraction session deleted successfully",
	})
}

// Helper function to generate URL hash
func generateURLHash(url string) string {
	// Simple hash implementation - in production, use a proper hash function
	hash := 0
	for _, char := range url {
		hash = int(char) + ((hash << 5) - hash)
	}
	return strconv.Itoa(hash)
}

// Helper function to calculate progress percentage
func calculateProgressPercent(processed, total int) float64 {
	if total == 0 {
		return 0
	}
	return float64(processed) / float64(total) * 100
}
