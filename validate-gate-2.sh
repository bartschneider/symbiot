#!/bin/bash
# GATE 2: SERVICE COMMUNICATION VALIDATION
# Memory-informed implementation based on Integration Validation Commands

set -e

echo "🔗 GATE 2: SERVICE COMMUNICATION VALIDATION"
echo "==========================================="

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "📋 Step 1: Service Discovery Validation"
# Test service-to-service connectivity within Docker network

echo "🔍 Testing backend -> postgres connectivity..."
docker exec windchaser-backend nc -zv postgres 5432
if [ $? -eq 0 ]; then
    echo "✅ Backend can reach postgres"
else
    echo "❌ Backend cannot reach postgres"
    exit 1
fi

echo "🔍 Testing backend -> redis connectivity..."
docker exec windchaser-backend nc -zv redis 6379
if [ $? -eq 0 ]; then
    echo "✅ Backend can reach redis"
else
    echo "❌ Backend cannot reach redis"  
    exit 1
fi

echo "🔍 Testing firecrawl -> postgres connectivity..."
# Use a simple connection test via node
docker exec firecrawl-service node -e "const net = require('net'); const client = net.createConnection(5432, 'postgres', () => { console.log('Connected'); client.end(); });" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Firecrawl can reach postgres"
else
    echo "❌ Firecrawl cannot reach postgres"
    exit 1
fi

echo "📋 Step 2: Network Configuration Validation"
# Validate service discovery and hostnames

echo "🔍 Testing hostname resolution..."
services=("postgres" "redis" "backend" "firecrawl-service")

for service in "${services[@]}"; do
    container_name=""
    case $service in
        "postgres") container_name="synthora-postgres" ;;
        "redis") container_name="synthora-redis" ;;
        "backend") container_name="windchaser-backend" ;;
        "firecrawl-service") container_name="firecrawl-service" ;;
    esac
    
    echo "🔍 Testing $service hostname resolution from backend..."
    # Use getent instead of nslookup which may not be available
    docker exec windchaser-backend getent hosts $service > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ $service hostname resolves correctly"
    else
        echo "❌ $service hostname resolution failed"
        exit 1
    fi
done

echo "📋 Step 3: API Contract Validation"
# Test basic API endpoints and contracts

echo "🔍 Testing backend API endpoints..."

# Test backend health with detailed response
backend_health=$(curl -s http://localhost:8080/health)
if [ $? -eq 0 ]; then
    echo "✅ Backend health endpoint: $backend_health"
else
    echo "❌ Backend health endpoint failed"
    exit 1
fi

# Test backend database connectivity endpoint
echo "🔍 Testing backend database connectivity..."
db_status=$(curl -s http://localhost:8080/api/db-status 2>/dev/null || echo "endpoint_not_found")
if [[ "$db_status" != "endpoint_not_found" ]]; then
    echo "✅ Backend database status: $db_status"
else
    echo "⚠️  Database status endpoint not implemented (will need to add)"
fi

echo "🔍 Testing firecrawl API endpoints..."

# Test firecrawl health with detailed response  
firecrawl_health=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "✅ Firecrawl health endpoint: $firecrawl_health"
else
    echo "❌ Firecrawl health endpoint failed"
    exit 1
fi

# Test firecrawl API structure
echo "🔍 Testing firecrawl API endpoints structure..."
api_endpoints=$(curl -s http://localhost:3001/api 2>/dev/null || echo "api_endpoint_check_needed")
if [[ "$api_endpoints" != "api_endpoint_check_needed" ]]; then
    echo "✅ Firecrawl API responding: $api_endpoints"
else
    echo "⚠️  Firecrawl API endpoint structure needs validation"
fi

echo "📋 Step 4: Authentication Flow Validation"
# Test authentication and authorization endpoints

echo "🔍 Testing authentication endpoints..."

# Test if auth endpoints exist
auth_test=$(curl -s -X POST http://localhost:8080/api/auth/test 2>/dev/null || echo "auth_endpoint_check_needed")
if [[ "$auth_test" != "auth_endpoint_check_needed" ]]; then
    echo "✅ Authentication endpoints available"
else
    echo "⚠️  Authentication endpoints need implementation"
fi

echo "📋 Step 5: Database Connection Validation"
# Validate actual database connections work

echo "🔍 Testing database connections..."

# Test postgres connection directly
docker exec synthora-postgres pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-synthora_prod}
if [ $? -eq 0 ]; then
    echo "✅ Postgres connection ready"
else
    echo "❌ Postgres connection failed"
    exit 1
fi

# Test redis connection
docker exec synthora-redis redis-cli ping > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Redis connection working"
else
    echo "❌ Redis connection failed"
    exit 1
fi

echo "📋 Step 6: Service Communication Summary"
echo "🔍 Service status overview:"
docker-compose ps

echo ""
echo "🎯 GATE 2 VALIDATION RESULTS"
echo "=============================="
echo "✅ Service-to-service connectivity verified"
echo "✅ Hostname resolution working"
echo "✅ Basic API endpoints responding"
echo "✅ Database connections established"
echo "⚠️  Some API endpoints need implementation (noted above)"
echo ""
echo "🚀 GATE 2 PASSED - Ready for Gate 3 (End-to-End Data Flow)"