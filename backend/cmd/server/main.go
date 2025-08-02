package main

import (
	"log"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/api"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/config"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize configuration
	cfg := config.New()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize database
	db, err := storage.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := storage.RunMigrations(cfg.Database); err != nil {
		log.Printf("Warning: Failed to run migrations: %v", err)
	}

	// Initialize router
	router := api.NewRouter(cfg, db)

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	log.Printf("API documentation available at http://localhost:%s/api/v1/health", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
