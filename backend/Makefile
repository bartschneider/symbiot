# Synthora Backend Makefile

# Variables
APP_NAME = synthora-backend
BINARY_NAME = server
MAIN_PATH = ./cmd/server
BUILD_DIR = ./bin
DOCKER_IMAGE = synthora/backend
VERSION ?= latest

# Go variables
GOCMD = go
GOBUILD = $(GOCMD) build
GOCLEAN = $(GOCMD) clean
GOTEST = $(GOCMD) test
GOGET = $(GOCMD) get
GOMOD = $(GOCMD) mod
GOLINT = golangci-lint

# Database variables
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_USER ?= postgres
DB_PASSWORD ?= password
DB_NAME ?= synthora_dev
DB_URL = postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

.PHONY: all build clean test coverage run deps tidy lint fmt vet help
.PHONY: docker-build docker-run docker-stop docker-clean
.PHONY: db-create db-drop db-migrate db-rollback db-reset db-seed
.PHONY: dev setup

# Default target
all: clean deps test build

# Help command
help:
	@echo "Available commands:"
	@echo "  build         Build the application binary"
	@echo "  clean         Clean build artifacts"
	@echo "  test          Run all tests"
	@echo "  coverage      Run tests with coverage report"
	@echo "  run           Run the application"
	@echo "  dev           Run in development mode with live reload"
	@echo "  deps          Download dependencies"
	@echo "  tidy          Tidy go modules"
	@echo "  lint          Run linter"
	@echo "  fmt           Format code"
	@echo "  vet           Run go vet"
	@echo "  setup         Initial project setup"
	@echo ""
	@echo "Database commands:"
	@echo "  db-create     Create database"
	@echo "  db-drop       Drop database"
	@echo "  db-migrate    Run migrations"
	@echo "  db-rollback   Rollback last migration"
	@echo "  db-reset      Reset database (drop, create, migrate)"
	@echo "  db-seed       Seed database with sample data"
	@echo ""
	@echo "Docker commands:"
	@echo "  docker-build  Build Docker image"
	@echo "  docker-run    Run application in Docker"
	@echo "  docker-stop   Stop Docker containers"
	@echo "  docker-clean  Clean Docker images and containers"

# Build the application
build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux $(GOBUILD) -a -installsuffix cgo -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)

# Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v ./...

# Run tests with coverage
coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run the application
run:
	@echo "Running $(APP_NAME)..."
	$(GOCMD) run $(MAIN_PATH)/main.go

# Run in development mode with live reload (requires air)
dev:
	@echo "Starting development server..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found. Installing..."; \
		go install github.com/cosmtrek/air@latest; \
		air; \
	fi

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GOGET) -d ./...
	$(GOMOD) download

# Tidy go modules
tidy:
	@echo "Tidying go modules..."
	$(GOMOD) tidy

# Run linter
lint:
	@echo "Running linter..."
	@if command -v $(GOLINT) > /dev/null; then \
		$(GOLINT) run; \
	else \
		echo "golangci-lint not found. Please install it first."; \
		echo "Visit: https://golangci-lint.run/usage/install/"; \
	fi

# Format code
fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

# Run go vet
vet:
	@echo "Running go vet..."
	$(GOCMD) vet ./...

# Database: Create database
db-create:
	@echo "Creating database $(DB_NAME)..."
	@createdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME) || echo "Database might already exist"

# Database: Drop database
db-drop:
	@echo "Dropping database $(DB_NAME)..."
	@dropdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME) || echo "Database might not exist"

# Database: Run migrations
db-migrate:
	@echo "Running migrations..."
	@if command -v migrate > /dev/null; then \
		migrate -path migrations -database "$(DB_URL)" up; \
	else \
		echo "migrate tool not found. Installing..."; \
		go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest; \
		migrate -path migrations -database "$(DB_URL)" up; \
	fi

# Database: Rollback last migration
db-rollback:
	@echo "Rolling back last migration..."
	@migrate -path migrations -database "$(DB_URL)" down 1

# Database: Reset database
db-reset: db-drop db-create db-migrate
	@echo "Database reset complete"

# Database: Seed with sample data (already included in migration)
db-seed:
	@echo "Sample data is included in initial migration"
	@echo "Run 'make db-migrate' to populate database with sample data"

# Docker: Build image
docker-build:
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):$(VERSION) .

# Docker: Run application
docker-run:
	@echo "Running application in Docker..."
	@docker-compose up -d

# Docker: Stop containers
docker-stop:
	@echo "Stopping Docker containers..."
	@docker-compose down

# Docker: Clean images and containers
docker-clean:
	@echo "Cleaning Docker artifacts..."
	@docker-compose down -v --remove-orphans
	@docker rmi $(DOCKER_IMAGE):$(VERSION) || true

# Initial project setup
setup:
	@echo "Setting up project..."
	@cp .env.example .env
	@echo "Created .env file from template"
	@echo "Please update .env with your configuration"
	@echo ""
	@echo "Installing dependencies..."
	@$(MAKE) deps
	@echo ""
	@echo "Setting up database..."
	@$(MAKE) db-create
	@$(MAKE) db-migrate
	@echo ""
	@echo "Setup complete!"
	@echo "Run 'make dev' to start development server"

# Install development tools
install-tools:
	@echo "Installing development tools..."
	@go install github.com/cosmtrek/air@latest
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@go install github.com/golangci-lint/golangci-lint/cmd/golangci-lint@latest