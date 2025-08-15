#!/bin/bash
# GATE 1: SERVICE HEALTH VALIDATION
# Memory-informed implementation based on Four-Gate Validation Framework

set -e

echo "🚨 GATE 1: SERVICE HEALTH VALIDATION"
echo "======================================"

# Configuration from memory: Configuration Validation Strategy
echo "📋 Step 1: Environment Configuration Validation"

# Check if .env exists, create if not
if [ ! -f .env ]; then
    echo "⚠️  Creating .env from .env.example"
    cp .env.example .env
fi

# Validate environment variables exist
echo "🔍 Validating environment variables..."
required_vars=("DB_USER" "DB_PASSWORD" "DB_NAME" "BACKEND_PORT" "FIRECRAWL_PORT" "FRONTEND_PORT")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        echo "❌ Missing environment variable: $var"
        exit 1
    fi
done
echo "✅ Environment variables validated"

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "📋 Step 2: Docker Compose Configuration Validation"
# Validate docker-compose configuration
docker-compose config --quiet
if [ $? -eq 0 ]; then
    echo "✅ Docker Compose configuration valid"
else
    echo "❌ Docker Compose configuration invalid"
    exit 1
fi

echo "📋 Step 3: Service Startup (Integration-First Methodology)"
# Start services with explicit health checks
echo "🚀 Starting services..."
docker-compose up -d postgres redis

# Wait for database and redis to be healthy
echo "⏳ Waiting for postgres health check..."
for i in {1..30}; do
    if docker-compose ps postgres | grep -q "healthy"; then
        echo "✅ Postgres is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Postgres failed to become healthy after 60 seconds"
        docker-compose logs postgres
        exit 1
    fi
    sleep 2
done

echo "⏳ Waiting for redis health check..."  
for i in {1..30}; do
    if docker-compose ps redis | grep -q "healthy"; then
        echo "✅ Redis is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis failed to become healthy after 60 seconds"
        docker-compose logs redis
        exit 1
    fi
    sleep 2
done

# Now start application services
echo "🚀 Starting application services..."
docker-compose up -d backend firecrawl-service

echo "📋 Step 4: Service Health Endpoint Validation"
# Integration Validation Commands from memory
services=("postgres:5432" "redis:6379" "backend:8080" "firecrawl-service:3001")

for service in "${services[@]}"; do
    service_name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    echo "🔍 Testing $service_name connectivity..."
    
    # Test port connectivity
    for j in {1..30}; do
        if nc -z localhost $port; then
            echo "✅ $service_name port $port is accessible"
            break
        fi
        if [ $j -eq 30 ]; then
            echo "❌ $service_name port $port is not accessible after 30 seconds"
            docker-compose logs $service_name
            exit 1
        fi
        sleep 1
    done
done

# Test specific health endpoints
echo "🔍 Testing backend health endpoint..."
for k in {1..15}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Backend health endpoint responding"
        break
    fi
    if [ $k -eq 15 ]; then
        echo "❌ Backend health endpoint not responding after 30 seconds"
        docker-compose logs backend
        exit 1
    fi
    sleep 2
done

echo "🔍 Testing firecrawl health endpoint..."
for l in {1..15}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Firecrawl health endpoint responding"
        break
    fi
    if [ $l -eq 15 ]; then
        echo "❌ Firecrawl health endpoint not responding after 30 seconds"
        docker-compose logs firecrawl-service
        exit 1
    fi
    sleep 2
done

echo "📋 Step 5: Service Status Summary"
docker-compose ps

echo ""
echo "🎯 GATE 1 VALIDATION RESULTS"
echo "=============================="
echo "✅ Environment configuration validated"
echo "✅ Docker Compose configuration validated"  
echo "✅ All services started successfully"
echo "✅ All health endpoints responding"
echo "✅ Service connectivity verified"
echo ""
echo "🚀 GATE 1 PASSED - Ready for Gate 2 (Service Communication)"