package handlers

import (
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/models"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

// ChartHandler handles chart-related API endpoints
type ChartHandler struct {
	db *storage.Database
}

// randFloat returns a random float64 in [min, max).
func randFloat(min, max float64) float64 {
	return min + rand.Float64()*(max-min)
}

// NewChartHandler creates a new chart handler
func NewChartHandler(db *storage.Database) *ChartHandler {
	return &ChartHandler{db: db}
}

// ListDatasets returns all datasets
func (h *ChartHandler) ListDatasets(c *gin.Context) {
	var datasets []models.Dataset

	query := h.db.DB

	// Filter by type if provided
	if datasetType := c.Query("type"); datasetType != "" {
		query = query.Where("type = ?", datasetType)
	}

	// Filter by public status
	if public := c.Query("public"); public != "" {
		if public == "true" {
			query = query.Where("is_public = ?", true)
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	if err := query.Offset(offset).Limit(limit).Find(&datasets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch datasets"})
		return
	}

	// Convert to response format
	var responses []models.DatasetResponse
	for _, dataset := range datasets {
		responses = append(responses, dataset.ToResponse(false))
	}

	c.JSON(http.StatusOK, gin.H{
		"datasets": responses,
		"page":     page,
		"limit":    limit,
	})
}

// CreateDataset creates a new dataset
func (h *ChartHandler) CreateDataset(c *gin.Context) {
	var req models.CreateDatasetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dataset := models.Dataset{
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		Source:      req.Source,
		Metadata:    req.Metadata,
		IsPublic:    req.IsPublic,
	}

	if err := h.db.Create(&dataset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dataset"})
		return
	}

	c.JSON(http.StatusCreated, dataset.ToResponse(false))
}

// GetDataset returns a specific dataset
func (h *ChartHandler) GetDataset(c *gin.Context) {
	id := c.Param("id")
	includeData := c.Query("include_data") == "true"

	var dataset models.Dataset
	query := h.db.DB

	if includeData {
		query = query.Preload("DataPoints")
	}

	if err := query.First(&dataset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dataset not found"})
		return
	}

	c.JSON(http.StatusOK, dataset.ToResponse(includeData))
}

// UpdateDataset updates a dataset
func (h *ChartHandler) UpdateDataset(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateDatasetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var dataset models.Dataset
	if err := h.db.First(&dataset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dataset not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		dataset.Name = req.Name
	}
	if req.Description != "" {
		dataset.Description = req.Description
	}
	if req.Metadata != nil {
		dataset.Metadata = req.Metadata
	}
	if req.IsPublic != nil {
		dataset.IsPublic = *req.IsPublic
	}

	if err := h.db.Save(&dataset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dataset"})
		return
	}

	c.JSON(http.StatusOK, dataset.ToResponse(false))
}

// DeleteDataset deletes a dataset
func (h *ChartHandler) DeleteDataset(c *gin.Context) {
	id := c.Param("id")

	// Delete data points first
	if err := h.db.Where("dataset_id = ?", id).Delete(&models.ChartDataPoint{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete data points"})
		return
	}

	// Delete dataset
	if err := h.db.Delete(&models.Dataset{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dataset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dataset deleted successfully"})
}

// AddDataPoints adds data points to a dataset
func (h *ChartHandler) AddDataPoints(c *gin.Context) {
	id := c.Param("id")

	var req models.AddDataPointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify dataset exists
	var dataset models.Dataset
	if err := h.db.First(&dataset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dataset not found"})
		return
	}

	// Convert input to data points
	datasetID, _ := strconv.ParseUint(id, 10, 32)
	var dataPoints []models.ChartDataPoint

	for _, input := range req.DataPoints {
		point := models.ChartDataPoint{
			X:         input.X,
			Y:         input.Y,
			Label:     input.Label,
			DatasetID: uint(datasetID),
		}

		if input.Timestamp != nil {
			point.Timestamp = *input.Timestamp
		} else {
			point.Timestamp = time.Now()
		}

		dataPoints = append(dataPoints, point)
	}

	// Bulk insert
	if err := h.db.Create(&dataPoints).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add data points"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Data points added successfully",
		"count":   len(dataPoints),
	})
}

// GetDataPoints returns data points for a dataset
func (h *ChartHandler) GetDataPoints(c *gin.Context) {
	id := c.Param("id")

	var dataPoints []models.ChartDataPoint
	query := h.db.Where("dataset_id = ?", id)

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset := (page - 1) * limit

	// Sorting
	sort := c.DefaultQuery("sort", "x")
	order := strings.ToLower(c.DefaultQuery("order", "asc"))
	if order != "asc" && order != "desc" {
		order = "asc"
	}
	orderBy := sort + " " + order

	if err := query.Order(orderBy).Offset(offset).Limit(limit).Find(&dataPoints).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data points"})
		return
	}

	// Convert to response format
	var responses []models.ChartDataPointResponse
	for _, point := range dataPoints {
		responses = append(responses, models.ChartDataPointResponse{
			ID:        point.ID,
			X:         point.X,
			Y:         point.Y,
			Label:     point.Label,
			Timestamp: point.Timestamp,
			CreatedAt: point.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data_points": responses,
		"page":        page,
		"limit":       limit,
	})
}

// DeleteDataPoint deletes a specific data point
func (h *ChartHandler) DeleteDataPoint(c *gin.Context) {
	datasetID := c.Param("id")
	pointID := c.Param("pointId")

	if err := h.db.Where("id = ? AND dataset_id = ?", pointID, datasetID).Delete(&models.ChartDataPoint{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete data point"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data point deleted successfully"})
}

// GenerateSampleData generates sample data for development/testing
func (h *ChartHandler) GenerateSampleData(c *gin.Context) {
	dataType := c.Param("type")
	points, _ := strconv.Atoi(c.DefaultQuery("points", "20"))

	var data []models.ChartDataPointResponse
	now := time.Now()

	switch dataType {
	case "stock":
		// Generate realistic stock-like data using a simple random walk
		// Seed RNG for sample generation (safe to reseed here for endpoint scope)
		rand.Seed(time.Now().UnixNano())

		currentPrice := 100.0
		volatility := 0.05
		drift := 0.001
		for i := 0; i < points; i++ {
			timestamp := now.Add(time.Duration(-points+i) * 24 * time.Hour)
			// change ~ U[-volatility, +volatility] + drift
			change := randFloat(-volatility, volatility) + drift
			currentPrice *= (1 + change)

			data = append(data, models.ChartDataPointResponse{
				X:         float64(i),
				Y:         math.Round(currentPrice*100) / 100,
				Label:     timestamp.Format("Jan 02"),
				Timestamp: timestamp,
			})
		}

	case "sinusoidal":
		// Generate sine wave data
		amplitude := 30.0
		frequency := 1.0
		offset := 50.0

		for i := 0; i < points; i++ {
			x := (float64(i) / float64(points)) * 4 * math.Pi * frequency
			y := amplitude*math.Sin(x) + offset

			data = append(data, models.ChartDataPointResponse{
				X:     float64(i),
				Y:     math.Round(y*100) / 100,
				Label: "T" + strconv.Itoa(i),
			})
		}

	case "analytics":
		// Generate analytics-like data (page views, etc.)
		for i := 0; i < points; i++ {
			timestamp := now.Add(time.Duration(-points+i) * 24 * time.Hour)
			dayOfWeek := timestamp.Weekday()

			// Higher traffic on weekdays
			baseTraffic := 1000.0
			if dayOfWeek == time.Saturday || dayOfWeek == time.Sunday {
				baseTraffic = 500.0
			}

			// variation ~ U[-300, 300]
			variation := randFloat(-300, 300)
			traffic := baseTraffic + variation

			data = append(data, models.ChartDataPointResponse{
				X:         float64(i),
				Y:         math.Round(traffic),
				Label:     timestamp.Format("Jan 02"),
				Timestamp: timestamp,
			})
		}

	default:
		// Generate simple linear data with noise
		for i := 0; i < points; i++ {
			timestamp := now.Add(time.Duration(-points+i) * time.Hour)
			baseValue := 50.0
			trend := float64(i) * 2
			// noise ~ U[-10, 10]
			noise := randFloat(-10, 10)
			value := baseValue + trend + noise

			data = append(data, models.ChartDataPointResponse{
				X:         float64(i),
				Y:         math.Round(math.Max(0, value)*100) / 100,
				Label:     "Point " + strconv.Itoa(i+1),
				Timestamp: timestamp,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"type":         dataType,
		"data_points":  data,
		"count":        len(data),
		"generated_at": time.Now(),
	})
}
