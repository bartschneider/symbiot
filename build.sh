#!/bin/bash
set -e

# Build script for Sitemap Scraper Application
# Optimized for ARM64 architecture with comprehensive Docker support

# Configuration
DOCKER_BUILDKIT=1
export DOCKER_BUILDKIT

# Default ports
DEFAULT_FRONTEND_PORT=3030
DEFAULT_BACKEND_PORT=3001
DEFAULT_REDIS_PORT=6379

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_status() {
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

# Port management functions
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while lsof -i :$port >/dev/null 2>&1; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            print_error "Could not find available port starting from $start_port"
            exit 1
        fi
    done
    
    echo $port
}

check_port_conflicts() {
    print_status "Checking for port conflicts..."
    
    FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT)
    BACKEND_PORT=$(find_available_port $DEFAULT_BACKEND_PORT)
    REDIS_PORT=$(find_available_port $DEFAULT_REDIS_PORT)
    
    if [ "$FRONTEND_PORT" != "$DEFAULT_FRONTEND_PORT" ]; then
        print_warning "Frontend port $DEFAULT_FRONTEND_PORT in use, using port $FRONTEND_PORT"
    fi
    
    if [ "$BACKEND_PORT" != "$DEFAULT_BACKEND_PORT" ]; then
        print_warning "Backend port $DEFAULT_BACKEND_PORT in use, using port $BACKEND_PORT"
    fi
    
    if [ "$REDIS_PORT" != "$DEFAULT_REDIS_PORT" ]; then
        print_warning "Redis port $DEFAULT_REDIS_PORT in use, using port $REDIS_PORT"
    fi
    
    export FRONTEND_PORT BACKEND_PORT REDIS_PORT
}

# Help function
show_help() {
    echo "Sitemap Scraper Build Script"
    echo ""
    echo "Usage: ./build.sh [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Build and start production environment"
    echo "  build       Build Docker images only"
    echo "  clean       Clean up Docker resources"
    echo "  test        Run all tests in containers"
    echo "  logs        Show logs from running containers"
    echo "  stop        Stop all running containers"
    echo "  restart     Restart all services"
    echo "  health      Check health of all services"
    echo "  help        Show this help message"
    echo ""
    echo "Port Options:"
    echo "  --frontend-port PORT    Frontend port (default: 3030)"
    echo "  --backend-port PORT     Backend port (default: 3001)"
    echo "  --redis-port PORT       Redis port (default: 6379)"
    echo "  --auto-ports           Automatically find available ports"
    echo ""
    echo "Examples:"
    echo "  ./build.sh dev                                    # Start with default ports"
    echo "  ./build.sh --auto-ports dev                       # Auto-detect available ports"
    echo "  ./build.sh --frontend-port 8080 --backend-port 8081 prod"
    echo "  ./build.sh --auto-ports prod                      # Production with auto ports"
    echo "  ./build.sh clean                                  # Clean up resources"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    # Verify ARM64 platform support
    if ! docker buildx inspect --bootstrap &> /dev/null; then
        print_warning "Docker Buildx not available, falling back to standard build"
    fi
    
    print_success "Prerequisites check passed"
}

# Build Docker images
build_images() {
    print_status "Building Docker images for ARM64..."
    
    # Build frontend
    print_status "Building frontend image..."
    if docker build --platform linux/arm64 -t synthora-frontend:latest -f Dockerfile .; then
        print_success "Frontend image built successfully"
    else
        print_error "Failed to build frontend image"
        exit 1
    fi
    
    # Build backend
    print_status "Building backend image..."
    if docker build --platform linux/arm64 -t windchaser-service:latest -f windchaser-service/Dockerfile windchaser-service/; then
        print_success "Backend image built successfully"
    else
        print_error "Failed to build backend image"
        exit 1
    fi
    
    print_success "All images built successfully"
}

# Build development images
build_dev_images() {
    print_status "Building development Docker images..."
    
    # Build frontend dev
    print_status "Building frontend development image..."
    if docker build --platform linux/arm64 -t synthora-frontend:dev -f Dockerfile.dev .; then
        print_success "Frontend dev image built successfully"
    else
        print_error "Failed to build frontend dev image"
        exit 1
    fi
    
    # Build backend dev
    print_status "Building backend development image..."
    if docker build --platform linux/arm64 -t windchaser-service:dev -f windchaser-service/Dockerfile.dev windchaser-service/; then
        print_success "Backend dev image built successfully"
    else
        print_error "Failed to build backend dev image"
        exit 1
    fi
    
    print_success "All development images built successfully"
}

# Start development environment
start_dev() {
    print_status "Starting development environment..."
    
    check_port_conflicts
    build_dev_images
    
    # Create temporary compose file with dynamic ports
    export FRONTEND_PORT BACKEND_PORT REDIS_PORT
    envsubst '$FRONTEND_PORT $BACKEND_PORT $REDIS_PORT' < docker-compose.dev.yml > docker-compose.dev.tmp.yml
    
    # Start development services
    if docker-compose -f docker-compose.dev.tmp.yml up -d; then
        print_success "Development environment started"
        print_status "Frontend: http://localhost:$FRONTEND_PORT"
        print_status "Backend: http://localhost:$BACKEND_PORT"
        print_status "Backend Health: http://localhost:$BACKEND_PORT/health"
        
        # Show logs
        print_status "Showing logs (press Ctrl+C to stop following)..."
        docker-compose -f docker-compose.dev.tmp.yml logs -f
        
        # Cleanup
        rm -f docker-compose.dev.tmp.yml
    else
        print_error "Failed to start development environment"
        rm -f docker-compose.dev.tmp.yml
        exit 1
    fi
}

# Start production environment
start_prod() {
    print_status "Starting production environment..."
    
    check_port_conflicts
    build_images
    
    # Create temporary compose file with dynamic ports
    export FRONTEND_PORT BACKEND_PORT REDIS_PORT
    envsubst '$FRONTEND_PORT $BACKEND_PORT $REDIS_PORT' < docker-compose.yml > docker-compose.tmp.yml
    
    # Start production services
    if docker-compose -f docker-compose.tmp.yml up -d; then
        print_success "Production environment started"
        print_status "Frontend: http://localhost:$FRONTEND_PORT"
        print_status "Backend: http://localhost:$BACKEND_PORT"
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        # Check health
        check_health
        
        # Cleanup
        rm -f docker-compose.tmp.yml
    else
        print_error "Failed to start production environment"
        rm -f docker-compose.tmp.yml
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running comprehensive test suite..."
    
    # Build test images if needed
    build_dev_images
    
    # Run frontend tests
    print_status "Running frontend tests..."
    if docker-compose -f docker-compose.dev.yml run --rm frontend npm run test; then
        print_success "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        exit 1
    fi
    
    # Run backend tests
    print_status "Running backend tests..."
    if docker-compose -f docker-compose.dev.yml run --rm backend npm run test; then
        print_success "Backend tests passed"
    else
        print_error "Backend tests failed"
        exit 1
    fi
    
    # Run integration tests
    print_status "Running integration tests..."
    if docker-compose -f docker-compose.dev.yml run --rm frontend npm run test:integration; then
        print_success "Integration tests passed"
    else
        print_warning "Integration tests failed or not configured"
    fi
    
    print_success "All tests completed"
}

# Check health of services
check_health() {
    print_status "Checking service health..."
    
    # Use default ports if variables not set
    local backend_port=${BACKEND_PORT:-3001}
    local frontend_port=${FRONTEND_PORT:-3030}
    
    # Check backend health
    if curl -f http://localhost:$backend_port/health &> /dev/null; then
        print_success "Backend service is healthy"
    else
        print_error "Backend service is not responding"
        return 1
    fi
    
    # Check frontend accessibility
    if curl -f http://localhost:$frontend_port &> /dev/null; then
        print_success "Frontend service is healthy"
    else
        print_error "Frontend service is not responding"
        return 1
    fi
    
    print_success "All services are healthy"
}

# Show logs
show_logs() {
    print_status "Showing container logs..."
    
    if docker-compose ps -q | grep -q .; then
        docker-compose logs -f
    else
        print_warning "No running containers found"
        
        # Check for dev containers
        if docker-compose -f docker-compose.dev.yml ps -q | grep -q .; then
            print_status "Showing development container logs..."
            docker-compose -f docker-compose.dev.yml logs -f
        fi
    fi
}

# Stop services
stop_services() {
    print_status "Stopping all services..."
    
    # Stop production services
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Stop development services
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    
    print_success "All services stopped"
}

# Restart services
restart_services() {
    print_status "Restarting services..."
    
    stop_services
    
    if docker-compose ps -q | grep -q .; then
        start_prod
    elif docker-compose -f docker-compose.dev.yml ps -q | grep -q .; then
        start_dev
    else
        print_warning "No previous configuration detected, starting production environment"
        start_prod
    fi
}

# Clean up Docker resources
clean_up() {
    print_status "Cleaning up Docker resources..."
    
    # Stop all services
    stop_services
    
    # Remove images
    print_status "Removing application images..."
    docker rmi synthora-frontend:latest synthora-frontend:dev 2>/dev/null || true
    docker rmi windchaser-service:latest windchaser-service:dev 2>/dev/null || true
    
    # Clean up unused resources
    print_status "Cleaning up unused Docker resources..."
    docker system prune -f
    
    # Remove volumes (with confirmation)
    read -p "Remove Docker volumes? This will delete all data (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        print_success "Volumes removed"
    fi
    
    print_success "Cleanup completed"
}

# Parse command line arguments
parse_args() {
    AUTO_PORTS=false
    CUSTOM_FRONTEND_PORT=""
    CUSTOM_BACKEND_PORT=""
    CUSTOM_REDIS_PORT=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-ports)
                AUTO_PORTS=true
                shift
                ;;
            --frontend-port)
                CUSTOM_FRONTEND_PORT="$2"
                shift 2
                ;;
            --backend-port)
                CUSTOM_BACKEND_PORT="$2"
                shift 2
                ;;
            --redis-port)
                CUSTOM_REDIS_PORT="$2"
                shift 2
                ;;
            dev|prod|build|test|logs|stop|restart|health|clean|help|--help|-h)
                COMMAND="$1"
                shift
                break
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set ports based on arguments
    if [ "$AUTO_PORTS" = true ]; then
        # Will be set by check_port_conflicts
        :
    else
        FRONTEND_PORT=${CUSTOM_FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
        BACKEND_PORT=${CUSTOM_BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
        REDIS_PORT=${CUSTOM_REDIS_PORT:-$DEFAULT_REDIS_PORT}
        export FRONTEND_PORT BACKEND_PORT REDIS_PORT
    fi
}

# Main script logic
main() {
    parse_args "$@"
    
    case "${COMMAND:-help}" in
        dev)
            check_prerequisites
            if [ "$AUTO_PORTS" = true ]; then
                check_port_conflicts
            fi
            start_dev
            ;;
        prod)
            check_prerequisites
            if [ "$AUTO_PORTS" = true ]; then
                check_port_conflicts
            fi
            start_prod
            ;;
        build)
            check_prerequisites
            build_images
            ;;
        test)
            check_prerequisites
            run_tests
            ;;
        logs)
            show_logs
            ;;
        stop)
            stop_services
            ;;
        restart)
            check_prerequisites
            if [ "$AUTO_PORTS" = true ]; then
                check_port_conflicts
            fi
            restart_services
            ;;
        health)
            check_health
            ;;
        clean)
            clean_up
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: ${COMMAND:-help}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"