# DevContainer Configuration - Synthora Analytics Platform

## Project Information
- **Name**: Synthora Analytics (Stocks Out for Harambe)
- **Type**: Full-Stack Microservices
- **Tech Stack**: React + TypeScript + Vite + Go + Node.js + PostgreSQL + Redis
- **Architecture**: Frontend (React/TypeScript) + Backend API (Go) + Firecrawl Service (Node.js) + Database + Cache

## Container Configuration
- **Docker Compose File**: `docker-compose.dev.yml`
- **Main Container**: `synthora-dev-container`
- **Build Timeout**: 10 minutes
- **Platform**: linux/arm64 (Apple Silicon optimized)

## Services Definition

### Primary Application Services
```yaml
- name: "synthora-frontend-dev"
  type: "frontend"
  technology: "React + TypeScript + Vite"
  ports: ["5173:5173"]
  hot_reload: true
  debugger_port: "5173"
  
- name: "synthora-backend-dev" 
  type: "backend"
  technology: "Go + Gin"
  ports: ["8080:8080", "2345:2345"]
  hot_reload: "air"
  debugger_port: "2345"
  
- name: "firecrawl-backend-dev"
  type: "microservice"
  technology: "Node.js + Express"
  ports: ["3001:3001", "9229:9229"]
  hot_reload: "nodemon"
  debugger_port: "9229"
```

### Infrastructure Services
```yaml
- name: "postgres-dev"
  type: "database"
  ports: ["5432:5432"]
  image: "postgres:15-alpine"
  
- name: "redis-dev"
  type: "cache"
  ports: ["6379:6379"]
  image: "redis:7-alpine"
  
- name: "dev-tools"
  type: "utility"
  image: "node:20-alpine"
  profile: "tools"
```

## Service Validation Tests

### Frontend Health Checks
```bash
# React Development Server
curl -f http://localhost:5173 || exit 1

# HMR WebSocket Connection
curl -f http://localhost:5173/vite-dev-server || echo "Vite dev server check"

# Build Assets Validation
curl -f http://localhost:5173/vite.svg || exit 1
```

### Backend API Health Checks
```bash
# Go Backend API
curl -f http://localhost:8080/health || exit 1
curl -f http://localhost:8080/api/v1/ping || exit 1

# Firecrawl Service API
curl -f http://localhost:3001/health || exit 1
curl -f http://localhost:3001/api/auth/status || exit 1
```

### Database & Cache Health Checks
```bash
# PostgreSQL Connection
pg_isready -h localhost -p 5432 -U postgres || exit 1

# Redis Connection
redis-cli -h localhost -p 6379 ping || exit 1

# Database Schema Validation
psql -h localhost -p 5432 -U postgres -d synthora_dev -c "SELECT 1;" || exit 1
```

### Integration Tests
```bash
# Cross-service communication
curl -f http://localhost:5173 && curl -f http://localhost:8080/health && curl -f http://localhost:3001/health

# JWT Authentication Flow
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'

# Data Pipeline Validation
curl -f http://localhost:8080/api/v1/charts/health && curl -f http://localhost:3001/api/convert/health
```

## Development Environment Setup

### Hot Reload Configuration
```yaml
frontend:
  tool: "Vite HMR"
  command: "npm run dev"
  port: 5173
  watch_paths: ["src/**/*", "public/**/*"]
  
backend:
  tool: "Air (Go Live Reload)"
  command: "make dev"
  port: 8080
  watch_paths: ["**/*.go", "go.mod", "go.sum"]
  
firecrawl:
  tool: "Nodemon"
  command: "npm run dev"
  port: 3001
  watch_paths: ["src/**/*.js"]
```

### Dependencies Management
```yaml
frontend:
  manager: "npm"
  install: "npm install"
  files: ["package.json", "package-lock.json"]
  
backend:
  manager: "go modules"
  install: "go mod download"
  files: ["go.mod", "go.sum"]
  tools: ["air", "migrate", "golangci-lint"]
  
firecrawl:
  manager: "npm"
  install: "npm install"
  files: ["firecrawl-service/package.json"]
```

## Development Commands

### Startup Commands
```bash
# Full stack development (recommended)
npm run dev:full

# Individual services
npm run dev                    # Frontend only
npm run backend:dev           # Go backend only
cd firecrawl-service && npm run dev  # Firecrawl service only

# Docker development environment
docker-compose -f docker-compose.dev.yml up -d
```

### Testing Commands
```bash
# Frontend tests
npm run test
npm run typecheck
npm run lint

# Backend tests  
cd backend && make test
cd backend && make coverage
cd backend && make lint

# Firecrawl service tests
cd firecrawl-service && npm test
cd firecrawl-service && npm run lint

# Integration testing
npm run test:integration
```

### Database Management
```bash
# Database setup and migrations
cd backend && make db-create
cd backend && make db-migrate
cd backend && make db-reset

# Database connection testing
cd backend && make db-ping
psql -h localhost -p 5432 -U postgres -d synthora_dev
```

### Build Commands
```bash
# Production builds
npm run build                 # Frontend build
cd backend && make build     # Backend binary
cd firecrawl-service && npm run build  # Service build

# Docker builds
docker-compose build
docker-compose -f docker-compose.dev.yml build
```

## Troubleshooting

### Common Issues & Solutions

#### Port Conflicts
```bash
# Check port usage
lsof -i :5173 -i :8080 -i :3001 -i :5432 -i :6379

# Kill conflicting processes
kill $(lsof -t -i :5173)  # Frontend
kill $(lsof -t -i :8080)  # Backend
kill $(lsof -t -i :3001)  # Firecrawl
```

#### Docker Issues
```bash
# Container health status
docker-compose -f docker-compose.dev.yml ps
docker-compose -f docker-compose.dev.yml logs -f

# Volume and network cleanup
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker volume prune -f
```

#### Database Connection Issues
```bash
# PostgreSQL troubleshooting
docker-compose -f docker-compose.dev.yml logs postgres-dev
pg_isready -h localhost -p 5432 -U postgres

# Reset database completely
cd backend && make db-drop && make db-create && make db-migrate
```

#### Node.js/Go Module Issues
```bash
# Clear Node.js cache
rm -rf node_modules package-lock.json
rm -rf firecrawl-service/node_modules firecrawl-service/package-lock.json
npm install

# Clear Go module cache
cd backend && go clean -modcache && go mod download
```

#### Hot Reload Not Working
```bash
# Frontend HMR issues
npm run dev -- --force
rm -rf dist .vite

# Backend air issues
cd backend && go install github.com/cosmtrek/air@latest
cd backend && air init

# File watching limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### TypeScript/Go Compilation Errors
```bash
# TypeScript issues
npm run typecheck
npx tsc --noEmit --skipLibCheck

# Go compilation issues
cd backend && go mod tidy
cd backend && go build ./...
cd backend && make fmt && make vet
```

#### Authentication/JWT Issues
```bash
# Test JWT service
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Check environment variables
docker-compose -f docker-compose.dev.yml config
```

#### Performance Issues
```bash
# Check resource usage
docker stats
htop

# Optimize Docker for development
docker-compose -f docker-compose.dev.yml down
docker system prune -f
docker-compose -f docker-compose.dev.yml up -d
```

## Success Criteria

### Development Environment Validation
- [ ] All services start successfully within 2 minutes
- [ ] Frontend accessible at http://localhost:5173 with HMR working
- [ ] Go backend API responds at http://localhost:8080/health
- [ ] Firecrawl service responds at http://localhost:3001/health
- [ ] PostgreSQL accepts connections and schema is migrated
- [ ] Redis cache service is running and accepts connections
- [ ] Hot reload works for all three main services
- [ ] TypeScript compilation passes without errors
- [ ] Go compilation passes without errors
- [ ] All health checks return successful responses
- [ ] Cross-service communication works (frontend → backend → firecrawl)
- [ ] Database migrations apply successfully
- [ ] JWT authentication flow works end-to-end
- [ ] File watching and auto-restart work for all services
- [ ] Docker containers are healthy and stable
- [ ] Development tools and debuggers are accessible

### Performance Benchmarks
- [ ] Frontend initial load < 3 seconds
- [ ] Backend API response time < 200ms
- [ ] Firecrawl service response time < 500ms
- [ ] Database query response time < 100ms
- [ ] Hot reload triggers < 2 seconds after file change
- [ ] Container startup time < 60 seconds
- [ ] Memory usage < 2GB total for all services
- [ ] CPU usage < 50% under normal development load

### Quality Assurance
- [ ] All linting passes (ESLint, golangci-lint)
- [ ] TypeScript type checking passes
- [ ] Unit tests pass for all services
- [ ] Integration tests pass
- [ ] Code coverage > 80% for critical paths
- [ ] No security vulnerabilities in dependencies
- [ ] All environment variables properly configured
- [ ] Logging is working and accessible
- [ ] Error handling works correctly across services
- [ ] CORS configuration allows proper development workflow