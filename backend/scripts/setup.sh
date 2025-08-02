#!/bin/bash

# Synthora Backend Setup Script
# This script sets up the development environment for the Go backend

set -e

echo "🚀 Synthora Backend Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Go
    if ! command_exists go; then
        log_error "Go is not installed. Please install Go 1.21 or later."
        log_info "Visit: https://golang.org/doc/install"
        exit 1
    fi
    
    GO_VERSION=$(go version | cut -d' ' -f3 | cut -d'o' -f2)
    log_success "Go $GO_VERSION found"
    
    # Check PostgreSQL (optional)
    if command_exists psql; then
        log_success "PostgreSQL client found"
    else
        log_warning "PostgreSQL client not found. You can use Docker instead."
    fi
    
    # Check Docker (optional)
    if command_exists docker; then
        log_success "Docker found"
    else
        log_warning "Docker not found. Manual database setup required."
    fi
    
    # Check Make
    if command_exists make; then
        log_success "Make found"
    else
        log_warning "Make not found. You'll need to run commands manually."
    fi
}

# Install development tools
install_tools() {
    log_info "Installing development tools..."
    
    # Air for live reload
    if ! command_exists air; then
        log_info "Installing Air for live reload..."
        go install github.com/cosmtrek/air@latest
        log_success "Air installed"
    else
        log_success "Air already installed"
    fi
    
    # Migrate tool for database migrations
    if ! command_exists migrate; then
        log_info "Installing migrate tool..."
        go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
        log_success "Migrate tool installed"
    else
        log_success "Migrate tool already installed"
    fi
    
    # golangci-lint for code quality
    if ! command_exists golangci-lint; then
        log_info "Installing golangci-lint..."
        go install github.com/golangci-lint/golangci-lint/cmd/golangci-lint@latest
        log_success "golangci-lint installed"
    else
        log_success "golangci-lint already installed"
    fi
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Copy .env.example to .env if it doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        log_success "Created .env file from template"
        log_warning "Please update .env with your configuration"
    else
        log_success ".env file already exists"
    fi
}

# Download dependencies
download_dependencies() {
    log_info "Downloading Go dependencies..."
    go mod download
    go mod tidy
    log_success "Dependencies downloaded"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Check if we should use Docker
    if command_exists docker && docker info >/dev/null 2>&1; then
        log_info "Using Docker for database setup..."
        
        # Check if PostgreSQL container is running
        if ! docker ps | grep -q synthora-postgres; then
            log_info "Starting PostgreSQL container..."
            docker-compose up -d postgres
            
            # Wait for database to be ready
            log_info "Waiting for database to be ready..."
            sleep 10
        fi
        
        log_success "Database container is running"
    else
        # Manual database setup
        log_warning "Docker not available. Manual database setup required."
        log_info "Please ensure PostgreSQL is installed and running"
        log_info "Create database: createdb synthora_dev"
    fi
    
    # Run migrations
    log_info "Running database migrations..."
    if command_exists make; then
        make db-migrate
    else
        if command_exists migrate; then
            migrate -path migrations -database "postgres://postgres:password@localhost:5432/synthora_dev?sslmode=disable" up
        else
            log_warning "Migrate tool not found. Please run migrations manually."
        fi
    fi
    
    log_success "Database setup complete"
}

# Build the application
build_application() {
    log_info "Building application..."
    
    if command_exists make; then
        make build
    else
        mkdir -p bin
        go build -o bin/server cmd/server/main.go
    fi
    
    log_success "Application built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    if command_exists make; then
        make test
    else
        go test ./...
    fi
    
    log_success "Tests completed"
}

# Main setup function
main() {
    echo
    log_info "Starting setup process..."
    echo
    
    check_prerequisites
    echo
    
    install_tools
    echo
    
    setup_environment
    echo
    
    download_dependencies
    echo
    
    setup_database
    echo
    
    build_application
    echo
    
    run_tests
    echo
    
    log_success "Setup completed successfully!"
    echo
    echo "🎉 Your Synthora backend is ready!"
    echo
    echo "Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Run 'make dev' to start development server"
    echo "3. Visit http://localhost:8080/health to verify"
    echo
    echo "Available commands:"
    echo "  make dev       - Start development server with live reload"
    echo "  make run       - Run the application"
    echo "  make test      - Run tests"
    echo "  make help      - Show all available commands"
    echo
}

# Handle script arguments
case "${1:-}" in
    --tools-only)
        install_tools
        ;;
    --db-only)
        setup_database
        ;;
    --no-db)
        check_prerequisites
        install_tools
        setup_environment
        download_dependencies
        build_application
        run_tests
        ;;
    *)
        main
        ;;
esac