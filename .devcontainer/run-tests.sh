#!/bin/bash
# Dev Container Test Runner Script
# Orchestrates E2E testing with comprehensive reporting

set -e

# Configuration
TEST_TYPE=${1:-"all"}
HEADLESS=${HEADLESS:-"true"}
CI=${CI:-"false"}
REPORT_DIR="/workspace/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🧪 Starting Knowledge Graph Platform E2E Test Suite"
echo "   Test Type: $TEST_TYPE"
echo "   Headless: $HEADLESS"
echo "   Report Directory: $REPORT_DIR"

# Ensure test directories exist
mkdir -p "$REPORT_DIR/screenshots"
mkdir -p "$REPORT_DIR/videos"
mkdir -p "$REPORT_DIR/traces"
mkdir -p "$REPORT_DIR/reports"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
timeout 300 bash -c '
    until curl -f http://frontend-testing:5173 >/dev/null 2>&1; do 
        echo "   Waiting for frontend..."
        sleep 5
    done
'

timeout 300 bash -c '
    until curl -f http://firecrawl-service:3001/health >/dev/null 2>&1; do 
        echo "   Waiting for API..."
        sleep 5
    done
'

echo "✅ All services ready!"

# Set environment for tests
export BASE_URL="http://frontend-testing:5173"
export API_URL="http://firecrawl-service:3001"
export PLAYWRIGHT_HTML_REPORT="$REPORT_DIR/reports/playwright-report-$TIMESTAMP"

# Function to run tests with proper error handling
run_test_suite() {
    local test_pattern="$1"
    local test_name="$2"
    
    echo "🚀 Running $test_name tests..."
    
    if npx playwright test $test_pattern \
        --reporter=html,json,junit \
        --output-dir="$REPORT_DIR" \
        --timeout=120000; then
        echo "✅ $test_name tests passed!"
        return 0
    else
        echo "❌ $test_name tests failed!"
        return 1
    fi
}

# Test execution based on type
case "$TEST_TYPE" in
    "smoke")
        echo "🔥 Running smoke tests..."
        run_test_suite "tests/e2e/core-functionality.spec.ts" "Smoke"
        ;;
    "performance")
        echo "⚡ Running performance tests..."
        run_test_suite "tests/e2e/performance.spec.ts" "Performance"
        ;;
    "phase35")
        echo "🧠 Running Phase 3.5 LLM tests..."
        run_test_suite "tests/e2e/phase35-vertex-ai.spec.ts" "Phase 3.5 LLM"
        ;;
    "integration")
        echo "🔗 Running integration tests..."
        run_test_suite "tests/e2e/phases-1-2-3-integration.spec.ts" "Integration"
        ;;
    "errors")
        echo "🚨 Running error handling tests..."
        run_test_suite "tests/e2e/error-handling.spec.ts" "Error Handling"
        ;;
    "all"|*)
        echo "🎯 Running comprehensive test suite..."
        
        # Track test results
        FAILED_TESTS=()
        
        # Core functionality tests
        if ! run_test_suite "tests/e2e/core-functionality.spec.ts" "Core Functionality"; then
            FAILED_TESTS+=("Core Functionality")
        fi
        
        # Phase 3.5 LLM tests
        if ! run_test_suite "tests/e2e/phase35-vertex-ai.spec.ts" "Phase 3.5 LLM"; then
            FAILED_TESTS+=("Phase 3.5 LLM")
        fi
        
        # Integration tests
        if ! run_test_suite "tests/e2e/phases-1-2-3-integration.spec.ts" "Integration"; then
            FAILED_TESTS+=("Integration")
        fi
        
        # Performance tests
        if ! run_test_suite "tests/e2e/performance.spec.ts" "Performance"; then
            FAILED_TESTS+=("Performance")
        fi
        
        # Error handling tests
        if ! run_test_suite "tests/e2e/error-handling.spec.ts" "Error Handling"; then
            FAILED_TESTS+=("Error Handling")
        fi
        
        # Report final results
        if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
            echo "🎉 All test suites passed!"
        else
            echo "⚠️  Some test suites failed:"
            printf '%s\n' "${FAILED_TESTS[@]}"
            exit 1
        fi
        ;;
esac

# Generate comprehensive test report
echo "📊 Generating test report..."
cat > "$REPORT_DIR/test-summary-$TIMESTAMP.md" << EOF
# Knowledge Graph Platform Test Report

**Timestamp**: $(date)
**Test Type**: $TEST_TYPE
**Environment**: Dev Container
**Base URL**: $BASE_URL

## Test Results Summary

$(if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "✅ **All tests passed successfully!**"
else
    echo "❌ **Some tests failed:**"
    printf '- %s\n' "${FAILED_TESTS[@]}"
fi)

## Service Endpoints Tested

- Frontend: http://frontend-testing:5173
- API Backend: http://firecrawl-service:3001
- Database: postgres-testing:5432
- Cache: redis-testing:6379

## Test Artifacts

- Screenshots: \`test-results/screenshots/\`
- Videos: \`test-results/videos/\`
- Traces: \`test-results/traces/\`
- HTML Report: \`test-results/reports/playwright-report-$TIMESTAMP/\`

## Next Steps

$(if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "The application is ready for deployment validation."
else
    echo "Review failed tests and address issues before deployment."
fi)
EOF

# Display test summary
echo ""
echo "📋 Test Execution Complete!"
echo "   Report: $REPORT_DIR/test-summary-$TIMESTAMP.md"
echo "   HTML Report: $REPORT_DIR/reports/playwright-report-$TIMESTAMP/index.html"
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "🎉 SUCCESS: All tests passed!"
    exit 0
else
    echo "❌ FAILURE: Some tests failed"
    exit 1
fi