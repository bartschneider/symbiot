#!/bin/bash

# E2E Test Runner for Knowledge Graph Platform Phase 2
# Usage: ./test-runner.sh [options]

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_ENV=${TEST_ENV:-"development"}
HEADLESS=${HEADLESS:-"true"}
BROWSER=${BROWSER:-"chromium"}
WORKERS=${WORKERS:-"4"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Knowledge Graph Platform E2E Test Runner${NC}"
echo -e "${BLUE}=================================================${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Function to display help
show_help() {
    echo -e "${YELLOW}Usage: $0 [options]${NC}"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --env ENV           Test environment (development|staging|production)"
    echo "  -b, --browser BROWSER   Browser to use (chromium|firefox|webkit|all)"
    echo "  -w, --workers NUM       Number of parallel workers (default: 4)"
    echo "  -t, --timeout SEC       Test timeout in seconds (default: 60)"
    echo "  --headed                Run in headed mode (default: headless)"
    echo "  --debug                 Run in debug mode with verbose output"
    echo "  --smoke                 Run only smoke tests"
    echo "  --performance           Run only performance tests"
    echo "  --errors                Run only error handling tests"
    echo "  --ui                    Open Playwright UI mode"
    echo "  --report                Open test report after completion"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run all tests in headless mode"
    echo "  $0 --headed --debug     # Run with browser UI and debug output"
    echo "  $0 --smoke              # Run only smoke tests"
    echo "  $0 --browser firefox    # Run tests in Firefox"
    echo "  $0 --ui                 # Open Playwright UI for test development"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            TEST_ENV="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --headed)
            HEADLESS="false"
            shift
            ;;
        --debug)
            DEBUG="true"
            shift
            ;;
        --smoke)
            TEST_FILTER="smoke"
            shift
            ;;
        --performance)
            TEST_FILTER="performance"
            shift
            ;;
        --errors)
            TEST_FILTER="error"
            shift
            ;;
        --ui)
            UI_MODE="true"
            shift
            ;;
        --report)
            SHOW_REPORT="true"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Environment setup
echo -e "${YELLOW}🔧 Setting up test environment...${NC}"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/.bin/playwright" ]; then
    echo -e "${YELLOW}🎭 Installing Playwright...${NC}"
    npm install @playwright/test
fi

# Install browsers
echo -e "${YELLOW}🌐 Ensuring browsers are installed...${NC}"
npx playwright install chromium firefox webkit

# Environment variables
export NODE_ENV="test"
export BASE_URL="http://localhost:3002"
export TEST_ENV="$TEST_ENV"

if [ "$DEBUG" = "true" ]; then
    export DEBUG="pw:api"
    export PWDEBUG="1"
fi

if [ "$HEADLESS" = "false" ]; then
    export HEADED="true"
fi

# Prepare test results directory
mkdir -p test-results
rm -rf test-results/*

echo -e "${YELLOW}🏗️ Test Configuration:${NC}"
echo -e "  Environment: $TEST_ENV"
echo -e "  Browser: $BROWSER"
echo -e "  Workers: $WORKERS"
echo -e "  Headless: $HEADLESS"
echo -e "  Base URL: $BASE_URL"

# Check if application is running
echo -e "${YELLOW}🔍 Checking application status...${NC}"
if curl -s -f "$BASE_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Application is running at $BASE_URL${NC}"
else
    echo -e "${RED}❌ Application not accessible at $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Starting application in background...${NC}"
    
    # Start the application in background
    npm run dev > /dev/null 2>&1 &
    APP_PID=$!
    
    # Wait for application to start
    echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
    for i in {1..30}; do
        if curl -s -f "$BASE_URL/api/health" > /dev/null; then
            echo -e "${GREEN}✅ Application started successfully${NC}"
            break
        fi
        sleep 2
        echo -n "."
    done
    
    if ! curl -s -f "$BASE_URL/api/health" > /dev/null; then
        echo -e "${RED}❌ Failed to start application${NC}"
        exit 1
    fi
fi

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test"

# Add browser selection
if [ "$BROWSER" != "all" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$BROWSER"
fi

# Add workers
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --workers=$WORKERS"

# Add test filtering
if [ -n "$TEST_FILTER" ]; then
    case $TEST_FILTER in
        "smoke")
            PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep=\"TC001|TC101|TC401\""
            ;;
        "performance")
            PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD tests/e2e/performance.spec.ts"
            ;;
        "error")
            PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD tests/e2e/error-handling.spec.ts"
            ;;
    esac
fi

# Add timeout if specified
if [ -n "$TIMEOUT" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --timeout=$((TIMEOUT * 1000))"
fi

# UI Mode
if [ "$UI_MODE" = "true" ]; then
    echo -e "${BLUE}🎭 Opening Playwright UI Mode...${NC}"
    npx playwright test --ui
    exit 0
fi

# Run tests
echo -e "${BLUE}🧪 Running E2E tests...${NC}"
echo -e "${YELLOW}Command: $PLAYWRIGHT_CMD${NC}"
echo ""

# Execute tests
if eval "$PLAYWRIGHT_CMD"; then
    TEST_EXIT_CODE=0
    echo ""
    echo -e "${GREEN}✅ All tests completed successfully!${NC}"
else
    TEST_EXIT_CODE=$?
    echo ""
    echo -e "${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

# Generate test summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}===============${NC}"

# Count test results
if [ -f "test-results/results.json" ]; then
    TOTAL_TESTS=$(cat test-results/results.json | jq '.suites[].specs | length' | awk '{sum += $1} END {print sum}')
    PASSED_TESTS=$(cat test-results/results.json | jq '[.suites[].specs[].tests[] | select(.results[].status == "passed")] | length')
    FAILED_TESTS=$(cat test-results/results.json | jq '[.suites[].specs[].tests[] | select(.results[].status == "failed")] | length')
    
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    fi
fi

# Show artifacts location
echo ""
echo -e "${YELLOW}📁 Test artifacts available in:${NC}"
echo -e "  - test-results/ (screenshots, videos, traces)"
echo -e "  - playwright-report/ (HTML report)"

# Open report if requested
if [ "$SHOW_REPORT" = "true" ]; then
    echo -e "${BLUE}🌐 Opening test report...${NC}"
    npx playwright show-report
fi

# Cleanup
if [ -n "$APP_PID" ]; then
    echo -e "${YELLOW}🧹 Stopping background application...${NC}"
    kill $APP_PID 2>/dev/null || true
fi

echo -e "${BLUE}🎉 Test execution completed!${NC}"
exit $TEST_EXIT_CODE