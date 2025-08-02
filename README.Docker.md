# Docker Setup Guide - Sitemap Scraper Application

Complete Docker containerization setup for ARM64 architecture with development and production environments.

## 🚀 Quick Start

### Development Environment
```bash
# Start development with hot reloading
./build.sh dev

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Backend Health: http://localhost:3001/health
```

### Production Environment
```bash
# Build and start production
./build.sh prod

# Or use deployment script
./docker-deploy.sh deploy
```

## 📁 Docker Configuration Files

### Core Files
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development with hot reloading
- `sitemap-scraper-frontend/Dockerfile` - Production frontend
- `sitemap-scraper-frontend/Dockerfile.dev` - Development frontend
- `firecrawl-service/Dockerfile` - Production backend
- `firecrawl-service/Dockerfile.dev` - Development backend

### Scripts
- `build.sh` - Main build and development script
- `docker-deploy.sh` - Production deployment with zero-downtime

## 🏗️ Architecture

### Multi-Stage Builds
Both frontend and backend use optimized multi-stage builds:

**Frontend (Vite + React + TypeScript)**
```dockerfile
FROM node:20-alpine AS deps        # Dependency installation
FROM node:20-alpine AS builder     # Build application
FROM nginx:alpine AS production    # Serve with nginx
```

**Backend (Node.js + Express + Playwright)**
```dockerfile
FROM node:20-alpine AS deps        # Dependency installation
FROM node:20-alpine AS builder     # Test and validate
FROM node:20-alpine AS production  # Runtime with Chromium
```

### ARM64 Optimization
- Platform-specific builds: `--platform=linux/arm64`
- Optimized dependency installation
- ARM64-compatible Chromium setup for Playwright
- Multi-architecture support ready

## 🛠️ Build Script Usage

### Available Commands
```bash
./build.sh dev         # Development environment
./build.sh prod        # Production environment
./build.sh build       # Build images only
./build.sh test        # Run test suite
./build.sh logs        # Show container logs
./build.sh stop        # Stop all containers
./build.sh restart     # Restart services
./build.sh health      # Health checks
./build.sh clean       # Cleanup resources
./build.sh help        # Show help
```

### Development Workflow
```bash
# Start development
./build.sh dev

# In another terminal - check logs
./build.sh logs

# Run tests
./build.sh test

# Stop development
./build.sh stop
```

## 🚀 Production Deployment

### Zero-Downtime Deployment
```bash
# Deploy with health checks and rollback capability
./docker-deploy.sh deploy

# Monitor deployment
./docker-deploy.sh monitor

# Check status
./docker-deploy.sh status

# Rollback if needed
./docker-deploy.sh rollback
```

### Deployment Features
- **Zero-downtime deployment** with health checks
- **Automatic rollback** on failure
- **Backup creation** before deployment
- **Health monitoring** and validation
- **Resource usage** monitoring
- **Log aggregation** and viewing

## 🔧 Configuration

### Environment Variables

**Frontend (Production)**
```env
NODE_ENV=production
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=Sitemap Scraper
```

**Backend (Production)**
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=secure-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=3600
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_MAX_CONCURRENT=3
CONTENT_MAX_SIZE_MB=10
CONTENT_MAX_TIMEOUT_MS=60000
```

### Port Configuration
- **Frontend**: `3000` (nginx)
- **Backend**: `3001` (Node.js)
- **Development Debug**: `9229` (Node.js inspector)

### Volume Mounts (Development)
```yaml
volumes:
  # Frontend hot reloading
  - ./sitemap-scraper-frontend/src:/app/src
  - ./sitemap-scraper-frontend/public:/app/public
  
  # Backend hot reloading
  - ./firecrawl-service/src:/app/src
  - ./firecrawl-service/tests:/app/tests
```

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run all tests in containers
./build.sh test

# Specific test types
docker-compose -f docker-compose.dev.yml run --rm frontend npm run test:unit
docker-compose -f docker-compose.dev.yml run --rm frontend npm run test:integration
docker-compose -f docker-compose.dev.yml run --rm frontend npm run test:e2e
docker-compose -f docker-compose.dev.yml run --rm backend npm run test
```

### Test Configuration
- **Frontend**: Vitest + React Testing Library + Playwright
- **Backend**: Vitest with Playwright integration
- **Coverage**: 85% threshold for all metrics
- **E2E**: Cross-browser testing with ARM64 Chromium

## 📊 Monitoring & Health Checks

### Health Endpoints
- **Backend Health**: `GET /health`
- **Frontend**: HTTP 200 on root path

### Monitoring Commands
```bash
# Real-time monitoring dashboard
./docker-deploy.sh monitor

# Check service health
./docker-deploy.sh health

# View logs
./docker-deploy.sh logs

# Container resource usage
docker stats
```

### Health Check Configuration
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  start_period: 5s
  retries: 3
```

## 🔒 Security Features

### Production Security
- **Non-root user** execution
- **Minimal base images** (Alpine Linux)
- **Security scanning** with multi-stage builds
- **Secure defaults** for all services
- **Environment isolation** between dev/prod

### Network Security
```yaml
networks:
  sitemap-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 🗂️ File Structure

```
/Users/bartosz/github/stocks_out_for_harambe/
├── docker-compose.yml              # Production orchestration
├── docker-compose.dev.yml          # Development orchestration
├── build.sh                        # Main build script
├── docker-deploy.sh               # Deployment script
├── README.Docker.md               # This documentation
├── sitemap-scraper-frontend/
│   ├── Dockerfile                 # Production frontend
│   ├── Dockerfile.dev            # Development frontend
│   ├── nginx.conf                # nginx configuration
│   └── ...
└── firecrawl-service/
    ├── Dockerfile                # Production backend
    ├── Dockerfile.dev           # Development backend
    └── ...
```

## ⚠️ Prerequisites

### System Requirements
- **Docker**: Version 20.10+ with BuildKit support
- **Docker Compose**: Version 2.0+
- **Platform**: ARM64 (Apple Silicon) optimized
- **Memory**: Minimum 2GB available
- **Storage**: Minimum 4GB available

### Installation Check
```bash
# Verify Docker
docker --version
docker-compose --version

# Check platform support
docker buildx inspect --bootstrap

# Test ARM64 support
docker run --rm --platform=linux/arm64 alpine uname -m
```

## 🚨 Troubleshooting

### Common Issues

**1. Platform Mismatch**
```bash
# Force ARM64 platform
export DOCKER_DEFAULT_PLATFORM=linux/arm64
```

**2. Port Conflicts**
```bash
# Check port usage
lsof -i :3000
lsof -i :3001

# Stop conflicting services
./build.sh stop
```

**3. Memory Issues**
```bash
# Clean up Docker resources
./build.sh clean

# Check system resources
docker system df
```

**4. Build Failures**
```bash
# Clean build with no cache
docker-compose build --no-cache

# Check build logs
docker-compose logs --build
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=* ./build.sh dev

# Connect to running container
docker-compose exec frontend sh
docker-compose exec backend sh
```

## 📈 Performance Optimization

### Build Optimization
- **Multi-stage builds** minimize image size
- **Dependency caching** speeds up rebuilds
- **Parallel builds** reduce build time
- **.dockerignore** excludes unnecessary files

### Runtime Optimization
- **nginx** for static file serving
- **ARM64 native** execution
- **Resource limits** prevent overconsumption
- **Health checks** ensure reliability

### Development Performance
- **Volume mounts** for hot reloading
- **Nodemon** for backend auto-restart
- **Vite HMR** for frontend updates
- **Test parallelization** for faster CI

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Docker Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Test
        run: |
          ./build.sh build
          ./build.sh test
      - name: Deploy
        run: ./docker-deploy.sh deploy
```

### Pre-commit Hooks
```bash
# Install pre-commit hook
echo './build.sh test' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📞 Support

For issues with Docker setup:
1. Check [troubleshooting](#-troubleshooting) section
2. Review container logs: `./build.sh logs`
3. Verify health status: `./docker-deploy.sh health`
4. Clean and rebuild: `./build.sh clean && ./build.sh dev`

---

**Ready to containerize!** 🐳✨