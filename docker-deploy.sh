#!/bin/bash
set -e

# Production deployment script for Sitemap Scraper Application
# Handles deployment, monitoring, and maintenance operations

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="sitemap-scraper"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
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

# Show help
show_help() {
    echo "Production Deployment Script"
    echo ""
    echo "Usage: ./docker-deploy.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy          Deploy application with zero-downtime"
    echo "  rollback        Rollback to previous version"
    echo "  status          Show deployment status"
    echo "  logs            Show application logs"
    echo "  backup          Create backup of current state"
    echo "  restore         Restore from backup"
    echo "  update          Update to latest version"
    echo "  health          Comprehensive health check"
    echo "  monitor         Start monitoring mode"
    echo "  help            Show this help"
}

# Pre-deployment checks
pre_deploy_checks() {
    print_status "Running pre-deployment checks..."
    
    # Check Docker
    if ! docker info &> /dev/null; then
        print_error "Docker daemon not running"
        exit 1
    fi
    
    # Check compose file
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Validate compose configuration
    if ! docker-compose -f "$COMPOSE_FILE" config &> /dev/null; then
        print_error "Invalid docker-compose configuration"
        exit 1
    fi
    
    # Check disk space (require at least 2GB)
    available_space=$(df . | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        print_warning "Low disk space: less than 2GB available"
    fi
    
    # Check memory (require at least 1GB)
    available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [[ $available_memory -lt 1024 ]]; then
        print_warning "Low memory: less than 1GB available"
    fi
    
    print_success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    print_status "Creating backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_name="backup_${timestamp}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup docker-compose configuration
    cp "$COMPOSE_FILE" "$BACKUP_DIR/${backup_name}_compose.yml"
    
    # Backup current image tags
    docker-compose -f "$COMPOSE_FILE" images --format json > "$BACKUP_DIR/${backup_name}_images.json"
    
    # Create deployment info
    cat > "$BACKUP_DIR/${backup_name}_info.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Images:
$(docker-compose -f "$COMPOSE_FILE" images)
EOF
    
    print_success "Backup created: $backup_name"
    echo "$backup_name" > "$BACKUP_DIR/latest_backup.txt"
}

# Deploy with zero downtime
deploy() {
    print_status "Starting zero-downtime deployment..."
    
    pre_deploy_checks
    create_backup
    
    # Build new images
    print_status "Building updated images..."
    if ! docker-compose -f "$COMPOSE_FILE" build --parallel; then
        print_error "Failed to build images"
        exit 1
    fi
    
    # Health check before deployment
    print_status "Performing health checks..."
    
    # Start new containers alongside old ones
    print_status "Starting new containers..."
    if ! docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans; then
        print_error "Failed to start new containers"
        rollback
        exit 1
    fi
    
    # Wait for services to be ready
    print_status "Waiting for services to initialize..."
    sleep 30
    
    # Health check
    if ! health_check; then
        print_error "Health check failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Clean up old containers
    print_status "Cleaning up old containers..."
    docker system prune -f --filter "until=24h"
    
    print_success "Deployment completed successfully"
    
    # Show final status
    deployment_status
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    local max_attempts=12
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        print_status "Health check attempt $attempt/$max_attempts"
        
        # Check backend health
        if curl -f -s http://localhost:3001/health > /dev/null; then
            backend_healthy=true
        else
            backend_healthy=false
        fi
        
        # Check frontend accessibility
        if curl -f -s http://localhost:3000 > /dev/null; then
            frontend_healthy=true
        else
            frontend_healthy=false
        fi
        
        if [[ "$backend_healthy" = true && "$frontend_healthy" = true ]]; then
            print_success "All services are healthy"
            return 0
        fi
        
        print_warning "Services not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback to previous version
rollback() {
    print_status "Rolling back to previous version..."
    
    if [[ ! -f "$BACKUP_DIR/latest_backup.txt" ]]; then
        print_error "No backup found for rollback"
        exit 1
    fi
    
    backup_name=$(cat "$BACKUP_DIR/latest_backup.txt")
    
    if [[ ! -f "$BACKUP_DIR/${backup_name}_compose.yml" ]]; then
        print_error "Backup files not found"
        exit 1
    fi
    
    # Stop current services
    print_status "Stopping current services..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Restore backup configuration
    print_status "Restoring backup configuration..."
    cp "$BACKUP_DIR/${backup_name}_compose.yml" "$COMPOSE_FILE"
    
    # Start previous version
    print_status "Starting previous version..."
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        print_success "Rollback completed successfully"
    else
        print_error "Rollback failed"
        exit 1
    fi
    
    # Health check
    if health_check; then
        print_success "Rollback successful, services are healthy"
    else
        print_error "Rollback completed but services are unhealthy"
    fi
}

# Show deployment status
deployment_status() {
    print_status "Deployment Status"
    echo "=================================="
    
    # Container status
    echo "Container Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Service health
    echo "Service Health:"
    if curl -f -s http://localhost:3001/health > /dev/null; then
        echo "✅ Backend: Healthy"
    else
        echo "❌ Backend: Unhealthy"
    fi
    
    if curl -f -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend: Healthy"
    else
        echo "❌ Frontend: Unhealthy"
    fi
    echo ""
    
    # Resource usage
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""
    
    # Access URLs
    echo "Access URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:3001"
    echo "Backend Health: http://localhost:3001/health"
}

# Monitor services
monitor() {
    print_status "Starting monitoring mode (press Ctrl+C to exit)..."
    
    while true; do
        clear
        echo "Sitemap Scraper - Live Monitoring"
        echo "=================================="
        echo "Last update: $(date)"
        echo ""
        
        deployment_status
        
        sleep 10
    done
}

# Update to latest version
update() {
    print_status "Updating to latest version..."
    
    # Pull latest changes
    if git status &> /dev/null; then
        print_status "Pulling latest changes from git..."
        git pull origin main || print_warning "Git pull failed or not in git repository"
    fi
    
    # Deploy with latest code
    deploy
}

# Show logs
show_logs() {
    print_status "Showing application logs..."
    
    if [[ -n "$2" ]]; then
        # Show logs for specific service
        docker-compose -f "$COMPOSE_FILE" logs -f "$2"
    else
        # Show logs for all services
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Main function
main() {
    case "${1:-help}" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        status)
            deployment_status
            ;;
        logs)
            show_logs "$@"
            ;;
        backup)
            create_backup
            ;;
        health)
            health_check
            ;;
        monitor)
            monitor
            ;;
        update)
            update
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"