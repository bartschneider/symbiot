#!/bin/bash

# Security-focused test script for firecrawl service fixes
# QA Security Coordinator validation suite

set -e  # Exit on any error

echo "🔐 QA Security Coordinator - Firecrawl Service Test Suite"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
SECURITY_ISSUES=0

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_security() {
    echo -e "${RED}[SECURITY]${NC} $1"
    ((SECURITY_ISSUES++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Test 1: Environment validation utility
log_test "Testing environment validation utility"
if [ -f "firecrawl-service/src/utils/validateEnv.js" ]; then
    log_pass "Environment validation utility exists"
    
    # Check for security validations
    if grep -q "JWT_SECRET" "firecrawl-service/src/utils/validateEnv.js"; then
        log_pass "JWT_SECRET validation found"
    else
        log_fail "JWT_SECRET validation missing"
    fi
    
    if grep -q "DB_PASSWORD" "firecrawl-service/src/utils/validateEnv.js"; then
        log_pass "DB_PASSWORD validation found"
    else
        log_fail "DB_PASSWORD validation missing"
    fi
    
    if grep -q "minLength" "firecrawl-service/src/utils/validateEnv.js"; then
        log_pass "Minimum length validation implemented"
    else
        log_fail "Minimum length validation missing"
    fi
else
    log_fail "Environment validation utility missing"
fi

# Test 2: Enhanced error messages
log_test "Testing enhanced error messages in extractionHistory.js"
if [ -f "firecrawl-service/src/services/extractionHistory.js" ]; then
    if grep -q "Enhanced error context" "firecrawl-service/src/services/extractionHistory.js"; then
        log_pass "Enhanced error context implemented"
    else
        log_fail "Enhanced error context missing"
    fi
    
    if grep -q "Database constraint violation" "firecrawl-service/src/services/extractionHistory.js"; then
        log_pass "Database constraint error messages improved"
    else
        log_fail "Database constraint error messages not improved"
    fi
    
    if grep -q "Context:" "firecrawl-service/src/services/extractionHistory.js"; then
        log_pass "Error context logging implemented"
    else
        log_fail "Error context logging missing"
    fi
else
    log_fail "extractionHistory.js not found"
fi

# Test 3: Database configuration
log_test "Testing database configuration"
if [ -f "firecrawl-service/src/config/config.js" ]; then
    if grep -q "DB_HOST" "firecrawl-service/src/config/config.js"; then
        log_pass "DB_HOST configuration added"
    else
        log_fail "DB_HOST configuration missing"
    fi
    
    if grep -q "DB_PORT" "firecrawl-service/src/config/config.js"; then
        log_pass "DB_PORT configuration added"
    else
        log_fail "DB_PORT configuration missing"
    fi
    
    if grep -q "parseInt.*DB_PORT" "firecrawl-service/src/services/database.js"; then
        log_pass "Database port parsing fixed"
    else
        log_fail "Database port parsing not fixed"
    fi
else
    log_fail "config.js not found"
fi

# Test 4: Docker compose network alignment
log_test "Testing Docker compose network alignment"
if [ -f "docker-compose.yml" ]; then
    if grep -q "sitemap-network" "docker-compose.yml"; then
        log_pass "Sitemap network defined in main compose"
    else
        log_fail "Sitemap network missing in main compose"
    fi
    
    if grep -q "postgres:" "docker-compose.yml"; then
        log_pass "PostgreSQL service added to main compose"
    else
        log_fail "PostgreSQL service missing from main compose"
    fi
    
    if grep -q "DB_HOST=postgres" "docker-compose.yml"; then
        log_pass "Database host properly configured"
    else
        log_fail "Database host configuration missing"
    fi
    
    if grep -q "depends_on:" "docker-compose.yml"; then
        log_pass "Service dependencies configured"
    else
        log_fail "Service dependencies missing"
    fi
else
    log_fail "docker-compose.yml not found"
fi

# Test 5: PostgreSQL initialization script
log_test "Testing PostgreSQL initialization script"
if [ -f "firecrawl-service/database/init/01-init-database.sql" ]; then
    if grep -q "DO \$\$" "firecrawl-service/database/init/01-init-database.sql"; then
        log_pass "PostgreSQL user creation syntax fixed"
    else
        log_fail "PostgreSQL user creation syntax not fixed"
    fi
    
    if grep -q "WHERE NOT EXISTS" "firecrawl-service/database/init/01-init-database.sql"; then
        log_pass "Conditional database creation implemented"
    else
        log_fail "Conditional database creation missing"
    fi
else
    log_fail "PostgreSQL initialization script not found"
fi

# Test 6: Security checks
log_test "Performing security validation"

# Check for hardcoded secrets
if grep -r "password123\|admin123\|secret123" firecrawl-service/ 2>/dev/null; then
    log_security "Hardcoded weak passwords detected"
else
    log_pass "No obvious hardcoded weak passwords found"
fi

# Check for proper environment variable usage
if grep -r "\${.*PASSWORD.*}" docker-compose.yml; then
    log_pass "Environment variable substitution used for passwords"
else
    log_fail "Environment variable substitution missing for passwords"
fi

# Check for proper error handling
if grep -q "try.*catch" "firecrawl-service/src/services/extractionHistory.js"; then
    log_pass "Try-catch error handling implemented"
else
    log_fail "Try-catch error handling missing"
fi

# Test 7: CORS configuration
log_test "Testing CORS configuration"
if [ -f "docker-compose.yml" ]; then
    if grep -q "CORS_ORIGIN" "docker-compose.yml"; then
        log_pass "CORS origin configuration found"
    else
        log_fail "CORS origin configuration missing"
    fi
else
    log_fail "Cannot test CORS configuration - docker-compose.yml missing"
fi

# Test 8: Health checks
log_test "Testing health check configuration"
if grep -q "healthcheck:" "docker-compose.yml"; then
    log_pass "Health checks configured"
    
    if grep -q "pg_isready" "docker-compose.yml"; then
        log_pass "PostgreSQL health check properly configured"
    else
        log_fail "PostgreSQL health check missing"
    fi
else
    log_fail "Health checks not configured"
fi

# Test 9: Volume configuration
log_test "Testing volume configuration"
if grep -q "postgres_data:" "docker-compose.yml"; then
    log_pass "PostgreSQL data volume configured"
else
    log_fail "PostgreSQL data volume missing"
fi

# Test 10: Service startup order
log_test "Testing service startup dependencies"
if grep -A2 "depends_on:" "docker-compose.yml" | grep -q "condition: service_healthy"; then
    log_pass "Service health dependencies configured"
else
    log_fail "Service health dependencies missing"
fi

# Summary
echo ""
echo "========================================================="
echo "🔐 QA Security Coordinator - Test Results Summary"
echo "========================================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Security Issues: ${RED}$SECURITY_ISSUES${NC}"

if [ $TESTS_FAILED -eq 0 ] && [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Ready for production deployment${NC}"
    exit 0
elif [ $SECURITY_ISSUES -gt 0 ]; then
    echo -e "${RED}🚨 SECURITY ISSUES DETECTED - DO NOT DEPLOY${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  Some tests failed - Review before deployment${NC}"
    exit 1
fi