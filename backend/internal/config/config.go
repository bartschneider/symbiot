package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all application configuration
type Config struct {
	Port      string
	GinMode   string
	Database  DatabaseConfig
	CORS      CORSConfig
	JWT       JWTConfig
	API       APIConfig
	Cache     CacheConfig
	Firecrawl FirecrawlConfig
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	URL      string // Full connection string
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

// APIConfig holds external API configuration
type APIConfig struct {
	AlphaVantageKey string
	PolygonKey      string
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	RedisURL string
	TTL      time.Duration
}

// FirecrawlConfig holds firecrawl service configuration
type FirecrawlConfig struct {
	BaseURL             string
	APIKey              string
	TimeoutSeconds      int
	MaxRetries          int
	ExtractionTimeoutMs int
	ConcurrentJobs      int
}

// New creates a new configuration instance
func New() *Config {
	return &Config{
		Port:    getEnv("PORT", "8080"),
		GinMode: getEnv("GIN_MODE", "debug"),
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "password"),
			Name:     getEnv("DB_NAME", "synthora_dev"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		CORS: CORSConfig{
			AllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"), ","),
			AllowedMethods: strings.Split(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS"), ","),
			AllowedHeaders: strings.Split(getEnv("CORS_ALLOWED_HEADERS", "Origin,Content-Type,Accept,Authorization,X-Requested-With"), ","),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
			Expiry: parseDuration(getEnv("JWT_EXPIRY", "24h")),
		},
		API: APIConfig{
			AlphaVantageKey: getEnv("ALPHA_VANTAGE_API_KEY", ""),
			PolygonKey:      getEnv("POLYGON_API_KEY", ""),
		},
		Cache: CacheConfig{
			RedisURL: getEnv("REDIS_URL", "localhost:6379"),
			TTL:      parseDuration(getEnv("CACHE_TTL", "300s")),
		},
		Firecrawl: FirecrawlConfig{
			BaseURL:             getEnv("FIRECRAWL_BASE_URL", "http://firecrawl-service:3001"),
			APIKey:              getEnv("FIRECRAWL_API_KEY", ""),
			TimeoutSeconds:      getEnvAsInt("FIRECRAWL_TIMEOUT_SECONDS", 30),
			MaxRetries:          getEnvAsInt("FIRECRAWL_MAX_RETRIES", 3),
			ExtractionTimeoutMs: getEnvAsInt("FIRECRAWL_EXTRACTION_TIMEOUT_MS", 60000),
			ConcurrentJobs:      getEnvAsInt("FIRECRAWL_CONCURRENT_JOBS", 5),
		},
	}
}

// GetDatabaseURL returns the full database connection string
func (c *Config) GetDatabaseURL() string {
	if c.Database.URL != "" {
		return c.Database.URL
	}
	return "host=" + c.Database.Host +
		" port=" + c.Database.Port +
		" user=" + c.Database.User +
		" password=" + c.Database.Password +
		" dbname=" + c.Database.Name +
		" sslmode=" + c.Database.SSLMode
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.GinMode == "debug"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.GinMode == "release"
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// parseDuration parses duration string with fallback
func parseDuration(s string) time.Duration {
	duration, err := time.ParseDuration(s)
	if err != nil {
		return 5 * time.Minute // Default fallback
	}
	return duration
}

// getEnvAsInt gets environment variable as integer with fallback
func getEnvAsInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}
