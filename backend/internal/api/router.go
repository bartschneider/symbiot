package api

import (
	"net/http"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/api/handlers"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/api/middleware"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/config"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

// NewRouter creates and configures the API router
func NewRouter(cfg *config.Config, db *storage.Database) *gin.Engine {
	// Create Gin router
	router := gin.New()

	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.CORS(cfg.CORS))
	router.Use(middleware.SecurityHeaders())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "synthora-backend",
			"version": "1.0.0",
		})
	})

	// Initialize handlers
	chartHandler := handlers.NewChartHandler(db)
	textHandler := handlers.NewTextHandler(db)
	sitemapHandler := handlers.NewSitemapHandler(db, cfg)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Health check for API
		v1.GET("/health", func(c *gin.Context) {
			// Test database connection
			if err := db.Health(); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status": "unhealthy",
					"error":  "database connection failed",
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"status":    "healthy",
				"service":   "synthora-api",
				"version":   "1.0.0",
				"database":  "connected",
				"timestamp": gin.H{"unix": gin.Context{}},
			})
		})

		// Chart data endpoints
		charts := v1.Group("/charts")
		{
			charts.GET("", chartHandler.ListDatasets)
			charts.POST("", chartHandler.CreateDataset)
			charts.GET("/:id", chartHandler.GetDataset)
			charts.PUT("/:id", chartHandler.UpdateDataset)
			charts.DELETE("/:id", chartHandler.DeleteDataset)
			charts.POST("/:id/data", chartHandler.AddDataPoints)
			charts.GET("/:id/data", chartHandler.GetDataPoints)
			charts.DELETE("/:id/data/:pointId", chartHandler.DeleteDataPoint)
		}

		// Text analysis endpoints
		text := v1.Group("/text")
		{
			text.POST("/analyze", textHandler.AnalyzeText)
			text.POST("/analyze/batch", textHandler.BatchAnalyzeText)
			text.GET("/analyses", textHandler.ListAnalyses)
			text.GET("/analyses/:id", textHandler.GetAnalysis)
			text.DELETE("/analyses/:id", textHandler.DeleteAnalysis)
			text.GET("/keywords", textHandler.GetPopularKeywords)
			text.GET("/entities", textHandler.GetPopularEntities)
		}

		// Sitemap and extraction endpoints
		sitemap := v1.Group("/sitemap")
		{
			sitemap.POST("/discover", sitemapHandler.DiscoverSitemap)
			sitemap.POST("/extract/batch", sitemapHandler.StartBatchExtraction)
			sitemap.GET("/extract/:sessionId/progress", sitemapHandler.GetExtractionProgress)
			sitemap.POST("/extract/:sessionId/cancel", sitemapHandler.CancelExtraction)
			sitemap.POST("/extract/:sessionId/retry", sitemapHandler.RetryFailedExtractions)
			sitemap.GET("/extract/:sessionId", sitemapHandler.GetExtractionDetails)
			sitemap.DELETE("/extract/:sessionId", sitemapHandler.DeleteExtractionSession)
			sitemap.GET("/history", sitemapHandler.GetExtractionHistory)
		}

		// Extraction history proxy endpoints (proxy to Firecrawl service)
		extractionHistory := v1.Group("/extraction-history")
		{
			extractionHistory.GET("/check", sitemapHandler.ProxyExtractionHistoryCheck)
			extractionHistory.GET("/sessions", sitemapHandler.ProxyExtractionHistorySessions)
			extractionHistory.GET("/sessions/:sessionId", sitemapHandler.ProxyExtractionHistorySessionDetails)
			extractionHistory.GET("/retryable", sitemapHandler.ProxyExtractionHistoryRetryable)
			extractionHistory.POST("/retry", sitemapHandler.ProxyExtractionHistoryRetry)
		}

		// Sample data endpoints for development
		samples := v1.Group("/samples")
		{
			samples.GET("/chart-data/:type", chartHandler.GenerateSampleData)
			samples.GET("/text-samples", textHandler.GetSampleTexts)
		}

		// Analytics endpoints
		analytics := v1.Group("/analytics")
		{
			analytics.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"datasets_count":    0,
					"analyses_count":    0,
					"total_data_points": 0,
					"recent_activity":   []gin.H{},
				})
			})
		}
	}

	// Catch-all for undefined routes
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "endpoint not found",
			"path":  c.Request.URL.Path,
		})
	})

	return router
}
