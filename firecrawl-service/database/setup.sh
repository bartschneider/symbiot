#!/bin/bash

# PostgreSQL Database Setup Script for Firecrawl Service
# This script handles database initialization, migration, and verification

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-windchaser_db}
DB_USER=${DB_USER:-windchaser_user}
DB_PASSWORD=${DB_PASSWORD:-windchaser_password}

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables if .env exists
load_env() {
    if [ -f "$ENV_FILE" ]; then
        print_info "Loading environment from $ENV_FILE"
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    else
        print_warning "No .env file found at $ENV_FILE"
    fi
}

# Check if PostgreSQL is accessible
check_postgres() {
    print_info "Checking PostgreSQL connection to $DB_HOST:$DB_PORT"
    
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
            print_success "PostgreSQL is accessible"
            return 0
        else
            print_error "PostgreSQL is not accessible"
            return 1
        fi
    else
        print_warning "pg_isready not found, trying psql connection"
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            print_success "PostgreSQL connection successful"
            return 0
        else
            print_error "Cannot connect to PostgreSQL"
            return 1
        fi
    fi
}

# Create database directories
create_directories() {
    print_info "Creating database directories"
    
    mkdir -p "$SCRIPT_DIR/data"
    mkdir -p "$SCRIPT_DIR/backups"
    mkdir -p "$SCRIPT_DIR/pgadmin"
    mkdir -p "$SCRIPT_DIR/migrations"
    
    # Set appropriate permissions
    chmod 755 "$SCRIPT_DIR/data"
    chmod 755 "$SCRIPT_DIR/backups"
    chmod 755 "$SCRIPT_DIR/pgadmin"
    
    print_success "Database directories created"
}

# Start database containers
start_database() {
    print_info "Starting database containers"
    
    cd "$PROJECT_ROOT"
    
    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif command -v docker compose &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose not found"
        exit 1
    fi
    
    # Start PostgreSQL container
    $COMPOSE_CMD -f docker-compose.db.yml up -d postgres
    
    print_info "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_postgres; then
            print_success "PostgreSQL is ready"
            break
        else
            print_info "Attempt $attempt/$max_attempts - waiting for PostgreSQL..."
            sleep 2
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL failed to start within expected time"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations"
    
    local init_file="$SCRIPT_DIR/init/01-init-database.sql"
    
    if [ -f "$init_file" ]; then
        print_info "Running initialization script"
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -f "$init_file"; then
            print_success "Database initialization completed"
        else
            print_error "Database initialization failed"
            exit 1
        fi
    else
        print_error "Initialization script not found: $init_file"
        exit 1
    fi
    
    # Run additional migrations if they exist
    if [ -d "$SCRIPT_DIR/migrations" ]; then
        for migration in "$SCRIPT_DIR/migrations"/*.sql; do
            if [ -f "$migration" ]; then
                print_info "Running migration: $(basename "$migration")"
                if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"; then
                    print_success "Migration completed: $(basename "$migration")"
                else
                    print_error "Migration failed: $(basename "$migration")"
                    exit 1
                fi
            fi
        done
    fi
}

# Verify database setup
verify_setup() {
    print_info "Verifying database setup"
    
    # Check if tables exist
    local tables=("extraction_sessions" "url_extractions" "extraction_retries")
    
    for table in "${tables[@]}"; do
        local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
        
        if [ "${count// /}" = "1" ]; then
            print_success "Table '$table' exists"
        else
            print_error "Table '$table' does not exist"
            exit 1
        fi
    done
    
    # Check if views exist
    local views=("session_statistics" "retryable_urls")
    
    for view in "${views[@]}"; do
        local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name = '$view';")
        
        if [ "${count// /}" = "1" ]; then
            print_success "View '$view' exists"
        else
            print_error "View '$view' does not exist"
            exit 1
        fi
    done
    
    print_success "Database verification completed"
}

# Create environment file template
create_env_template() {
    local env_example="$PROJECT_ROOT/.env.example"
    
    print_info "Creating environment file template"
    
    cat > "$env_example" << EOF
# Firecrawl Service Environment Configuration

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=windchaser_db
DB_USER=windchaser_user
DB_PASSWORD=windchaser_password
DATABASE_URL=postgresql://windchaser_user:windchaser_password@localhost:5433/windchaser_db

# Database Pool Configuration
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=60000
DATABASE_QUERY_TIMEOUT=30000

# PgAdmin Configuration (Development)
PGADMIN_PORT=5050
PGADMIN_PASSWORD=secure_pgadmin_password_change_me

# Redis Configuration
REDIS_CACHE_PORT=6380

# Existing Configuration (keep existing values)
NODE_ENV=development
PORT=3001
JWT_SECRET=dev-jwt-secret-not-for-production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3030
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CACHE_TTL_SECONDS=300
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_MAX_CONCURRENT=2
DEBUG=windchaser:*
EOF

    print_success "Environment template created at $env_example"
    
    if [ ! -f "$ENV_FILE" ]; then
        cp "$env_example" "$ENV_FILE"
        print_success "Environment file created at $ENV_FILE"
        print_warning "Please review and update the database credentials in $ENV_FILE"
    fi
}

# Show help
show_help() {
    echo "Firecrawl Database Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo "  --init              Initialize database (create directories, start containers, run migrations)"
    echo "  --start             Start database containers only"
    echo "  --migrate           Run database migrations only"
    echo "  --verify            Verify database setup only"
    echo "  --stop              Stop database containers"
    echo "  --restart           Restart database containers"
    echo "  --backup            Create database backup"
    echo "  --env               Create environment file template"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST             Database host (default: localhost)"
    echo "  DB_PORT             Database port (default: 5433)"
    echo "  DB_NAME             Database name (default: windchaser_db)"
    echo "  DB_USER             Database user (default: windchaser_user)"
    echo "  DB_PASSWORD         Database password (default: windchaser_password)"
    echo ""
}

# Stop database containers
stop_database() {
    print_info "Stopping database containers"
    
    cd "$PROJECT_ROOT"
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif command -v docker compose &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose not found"
        exit 1
    fi
    
    $COMPOSE_CMD -f docker-compose.db.yml down
    print_success "Database containers stopped"
}

# Backup database
backup_database() {
    local backup_file="$SCRIPT_DIR/backups/windchaser_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    print_info "Creating database backup: $backup_file"
    
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"; then
        print_success "Database backup created: $backup_file"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

# Main execution
main() {
    load_env
    
    case "${1:-}" in
        --help)
            show_help
            ;;
        --init)
            create_directories
            create_env_template
            start_database
            run_migrations
            verify_setup
            print_success "Database initialization completed successfully"
            ;;
        --start)
            create_directories
            start_database
            ;;
        --migrate)
            run_migrations
            ;;
        --verify)
            verify_setup
            ;;
        --stop)
            stop_database
            ;;
        --restart)
            stop_database
            sleep 2
            start_database
            ;;
        --backup)
            backup_database
            ;;
        --env)
            create_env_template
            ;;
        "")
            # Default action - full initialization
            create_directories
            create_env_template
            start_database
            run_migrations
            verify_setup
            print_success "Database setup completed successfully"
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"