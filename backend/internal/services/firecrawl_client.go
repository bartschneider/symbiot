package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/config"
)

// FirecrawlClient handles communication with the firecrawl service
type FirecrawlClient struct {
	baseURL    string
	httpClient *http.Client
	cfg        *config.Config
}

// NewFirecrawlClient creates a new firecrawl client
func NewFirecrawlClient(cfg *config.Config) *FirecrawlClient {
	return &FirecrawlClient{
		baseURL: cfg.Firecrawl.BaseURL,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.Firecrawl.TimeoutSeconds) * time.Second,
		},
		cfg: cfg,
	}
}

// SitemapDiscoveryRequest represents a request to discover sitemap URLs
type SitemapDiscoveryRequest struct {
	BaseURL string `json:"base_url"`
}

// SitemapDiscoveryResponse represents the response from sitemap discovery
type SitemapDiscoveryResponse struct {
	URLs       []string `json:"urls"`
	Total      int      `json:"total"`
	SitemapURL string   `json:"sitemap_url,omitempty"`
}

// BatchExtractionRequest represents a request for batch URL extraction
type BatchExtractionRequest struct {
	SessionID string   `json:"session_id"`
	URLs      []string `json:"urls"`
	Options   struct {
		ChunkSize      int `json:"chunk_size"`
		MaxRetries     int `json:"max_retries"`
		TimeoutMs      int `json:"timeout_ms"`
		ConcurrentJobs int `json:"concurrent_jobs"`
	} `json:"options"`
}

// BatchExtractionResponse represents the response from batch extraction
type BatchExtractionResponse struct {
	SessionID     string `json:"session_id"`
	Status        string `json:"status"`
	TotalURLs     int    `json:"total_urls"`
	ProcessedURLs int    `json:"processed_urls"`
	Message       string `json:"message"`
}

// ExtractionProgressResponse represents extraction progress status
type ExtractionProgressResponse struct {
	SessionID              string  `json:"session_id"`
	Status                 string  `json:"status"`
	TotalURLs              int     `json:"total_urls"`
	ProcessedURLs          int     `json:"processed_urls"`
	SuccessfulURLs         int     `json:"successful_urls"`
	FailedURLs             int     `json:"failed_urls"`
	ProgressPercent        float64 `json:"progress_percent"`
	EstimatedTimeRemaining string  `json:"estimated_time_remaining,omitempty"`
}

// DiscoverSitemap discovers URLs from a sitemap
func (fc *FirecrawlClient) DiscoverSitemap(ctx context.Context, baseURL string) (*SitemapDiscoveryResponse, error) {
	req := SitemapDiscoveryRequest{
		BaseURL: baseURL,
	}

	var response SitemapDiscoveryResponse
	err := fc.makeRequest(ctx, "POST", "/api/sitemap/discover", req, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to discover sitemap: %w", err)
	}

	return &response, nil
}

// StartBatchExtraction starts a batch extraction process
func (fc *FirecrawlClient) StartBatchExtraction(ctx context.Context, sessionID string, urls []string, chunkSize, maxRetries int) (*BatchExtractionResponse, error) {
	req := BatchExtractionRequest{
		SessionID: sessionID,
		URLs:      urls,
	}
	req.Options.ChunkSize = chunkSize
	req.Options.MaxRetries = maxRetries
	req.Options.TimeoutMs = fc.cfg.Firecrawl.ExtractionTimeoutMs
	req.Options.ConcurrentJobs = fc.cfg.Firecrawl.ConcurrentJobs

	var response BatchExtractionResponse
	err := fc.makeRequest(ctx, "POST", "/api/convert/batch", req, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to start batch extraction: %w", err)
	}

	return &response, nil
}

// GetExtractionProgress gets the progress of an extraction session
func (fc *FirecrawlClient) GetExtractionProgress(ctx context.Context, sessionID string) (*ExtractionProgressResponse, error) {
	endpoint := fmt.Sprintf("/api/extraction-history/%s/progress", sessionID)

	var response ExtractionProgressResponse
	err := fc.makeRequest(ctx, "GET", endpoint, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to get extraction progress: %w", err)
	}

	return &response, nil
}

// CancelExtraction cancels an ongoing extraction session
func (fc *FirecrawlClient) CancelExtraction(ctx context.Context, sessionID string) error {
	endpoint := fmt.Sprintf("/api/extraction-history/%s/cancel", sessionID)

	err := fc.makeRequest(ctx, "POST", endpoint, nil, nil)
	if err != nil {
		return fmt.Errorf("failed to cancel extraction: %w", err)
	}

	return nil
}

// RetryFailedExtractions retries failed extractions in a session
func (fc *FirecrawlClient) RetryFailedExtractions(ctx context.Context, sessionID string) (*BatchExtractionResponse, error) {
	endpoint := fmt.Sprintf("/api/extraction-history/%s/retry", sessionID)

	var response BatchExtractionResponse
	err := fc.makeRequest(ctx, "POST", endpoint, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to retry failed extractions: %w", err)
	}

	return &response, nil
}

// HealthCheck checks if the firecrawl service is healthy
func (fc *FirecrawlClient) HealthCheck(ctx context.Context) error {
	err := fc.makeRequest(ctx, "GET", "/health", nil, nil)
	if err != nil {
		return fmt.Errorf("firecrawl service health check failed: %w", err)
	}
	return nil
}

// makeRequest is a helper method to make HTTP requests with retry logic
func (fc *FirecrawlClient) makeRequest(ctx context.Context, method, endpoint string, reqBody, respBody interface{}) error {
	url := fc.baseURL + endpoint

	var body io.Reader
	if reqBody != nil {
		jsonData, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	// Retry logic with exponential backoff
	maxRetries := fc.cfg.Firecrawl.MaxRetries
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 1s, 2s, 4s, 8s...
			waitTime := time.Duration(1<<uint(attempt-1)) * time.Second
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(waitTime):
			}
		}

		req, err := http.NewRequestWithContext(ctx, method, url, body)
		if err != nil {
			return fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")

		// Add authentication if configured
		if fc.cfg.Firecrawl.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+fc.cfg.Firecrawl.APIKey)
		}

		resp, err := fc.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			continue
		}

		responseBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			lastErr = fmt.Errorf("failed to read response body: %w", err)
			continue
		}

		// Check for successful status codes
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			if respBody != nil {
				if err := json.Unmarshal(responseBody, respBody); err != nil {
					return fmt.Errorf("failed to unmarshal response: %w", err)
				}
			}
			return nil
		}

		// Handle different error status codes
		switch resp.StatusCode {
		case http.StatusTooManyRequests:
			lastErr = fmt.Errorf("rate limited (429): %s", string(responseBody))
			// Continue retrying for rate limits
		case http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
			lastErr = fmt.Errorf("service unavailable (%d): %s", resp.StatusCode, string(responseBody))
			// Continue retrying for server errors
		case http.StatusBadRequest:
			// Don't retry for client errors
			return fmt.Errorf("bad request (400): %s", string(responseBody))
		case http.StatusUnauthorized:
			// Don't retry for auth errors
			return fmt.Errorf("unauthorized (401): %s", string(responseBody))
		case http.StatusNotFound:
			// Don't retry for not found
			return fmt.Errorf("not found (404): %s", string(responseBody))
		default:
			if resp.StatusCode >= 500 {
				lastErr = fmt.Errorf("server error (%d): %s", resp.StatusCode, string(responseBody))
				// Continue retrying for server errors
			} else {
				// Don't retry for other client errors
				return fmt.Errorf("client error (%d): %s", resp.StatusCode, string(responseBody))
			}
		}
	}

	return fmt.Errorf("request failed after %d retries: %w", maxRetries, lastErr)
}
