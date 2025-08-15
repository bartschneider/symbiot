#!/bin/bash
# Dev Container Deployment Validation Script
# Comprehensive validation of dev container setup and Playwright integration

set -e

echo "🔍 Validating Knowledge Graph Platform Dev Container Deployment"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation functions
validate_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo -e "✅ ${GREEN}$description${NC}: $file"
        return 0
    else
        echo -e "❌ ${RED}$description${NC}: $file (MISSING)"
        return 1
    fi
}

validate_directory() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        echo -e "✅ ${GREEN}$description${NC}: $dir"
        return 0
    else
        echo -e "❌ ${RED}$description${NC}: $dir (MISSING)"
        return 1
    fi
}

validate_executable() {
    local file="$1"
    local description="$2"
    
    if [ -x "$file" ]; then
        echo -e "✅ ${GREEN}$description${NC}: $file (executable)"
        return 0
    else
        echo -e "❌ ${RED}$description${NC}: $file (not executable)"
        return 1
    fi
}

# Validation results tracking
VALIDATION_PASSED=0
VALIDATION_FAILED=0

run_validation() {
    if "$@"; then
        ((VALIDATION_PASSED++))
    else
        ((VALIDATION_FAILED++))
    fi
}

echo "📁 Dev Container Configuration Files"
echo "-----------------------------------"

run_validation validate_file ".devcontainer/devcontainer.json" "Dev Container Config"
run_validation validate_file ".devcontainer/docker-compose.devcontainer.yml" "Docker Compose Extension"
run_validation validate_file ".devcontainer/Dockerfile.devcontainer" "Dev Container Dockerfile"
run_validation validate_executable ".devcontainer/initialize.sh" "Initialization Script"
run_validation validate_executable ".devcontainer/post-create.sh" "Post-Create Script"
run_validation validate_executable ".devcontainer/post-start.sh" "Post-Start Script"
run_validation validate_executable ".devcontainer/run-tests.sh" "Test Runner Script"

echo ""
echo "🎭 Playwright Configuration & Testing"
echo "------------------------------------"

run_validation validate_file ".devcontainer/playwright.config.devcontainer.ts" "Dev Container Playwright Config"
run_validation validate_file ".devcontainer/test-protocol.md" "Test Protocol Documentation"
run_validation validate_file "playwright.config.ts" "Main Playwright Config"
run_validation validate_directory "tests/e2e" "E2E Test Directory"

echo ""
echo "🐳 Docker & Infrastructure"
echo "-------------------------"

run_validation validate_file "docker-compose.user-testing.yml" "User Testing Compose"
run_validation validate_file "Dockerfile.dev" "Development Dockerfile"
run_validation validate_file "package.json" "Package Configuration"

# Check for Node.js and dependencies
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "✅ ${GREEN}Node.js${NC}: $NODE_VERSION"
    ((VALIDATION_PASSED++))
else
    echo -e "❌ ${RED}Node.js${NC}: Not installed"
    ((VALIDATION_FAILED++))
fi

if command -v npx >/dev/null 2>&1; then
    if npx playwright --version >/dev/null 2>&1; then
        PW_VERSION=$(npx playwright --version)
        echo -e "✅ ${GREEN}Playwright${NC}: $PW_VERSION"
        ((VALIDATION_PASSED++))
    else
        echo -e "❌ ${RED}Playwright${NC}: Not installed"
        ((VALIDATION_FAILED++))
    fi
else
    echo -e "❌ ${RED}NPX${NC}: Not available"
    ((VALIDATION_FAILED++))
fi

echo ""
echo "🧪 Test Suite Validation"
echo "------------------------"

# Check for specific test files
TEST_FILES=(
    "tests/e2e/core-functionality.spec.ts"
    "tests/e2e/phase35-vertex-ai.spec.ts"
    "tests/e2e/phases-1-2-3-integration.spec.ts"
    "tests/e2e/performance.spec.ts"
    "tests/e2e/error-handling.spec.ts"
)

for test_file in "${TEST_FILES[@]}"; do
    run_validation validate_file "$test_file" "Test: $(basename "$test_file")"
done

echo ""
echo "🔧 Environment Configuration"
echo "----------------------------"

# Check environment files
if [ -f ".env.example" ]; then
    echo -e "✅ ${GREEN}Environment Template${NC}: .env.example"
    ((VALIDATION_PASSED++))
else
    echo -e "❌ ${RED}Environment Template${NC}: .env.example (MISSING)"
    ((VALIDATION_FAILED++))
fi

# Check VS Code configuration
if [ -f ".vscode/settings.json" ] || [ -f ".vscode/extensions.json" ]; then
    echo -e "✅ ${GREEN}VS Code Config${NC}: .vscode/ directory"
    ((VALIDATION_PASSED++))
else
    echo -e "⚠️  ${YELLOW}VS Code Config${NC}: .vscode/ directory (optional)"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="

TOTAL_VALIDATIONS=$((VALIDATION_PASSED + VALIDATION_FAILED))

echo -e "✅ ${GREEN}Passed${NC}: $VALIDATION_PASSED"
echo -e "❌ ${RED}Failed${NC}: $VALIDATION_FAILED"
echo -e "📊 ${YELLOW}Total${NC}: $TOTAL_VALIDATIONS"

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo ""
    echo -e "🎉 ${GREEN}SUCCESS${NC}: Dev container deployment is ready!"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Open project in VS Code"
    echo "2. Command: 'Dev Containers: Reopen in Container'"
    echo "3. Wait for post-create setup to complete"
    echo "4. Run: npm run test:e2e"
    echo ""
    echo "🎭 Playwright MCP Integration:"
    echo "- test:e2e:ui          # Interactive test UI"
    echo "- test:e2e:debug       # Debug mode"
    echo "- test:phase35         # Phase 3.5 LLM tests"
    echo ""
    exit 0
else
    echo ""
    echo -e "⚠️  ${YELLOW}WARNING${NC}: Some validation checks failed"
    echo "Please review and fix the issues above before proceeding."
    echo ""
    echo "🔧 Common fixes:"
    echo "- chmod +x .devcontainer/*.sh"
    echo "- npm install"
    echo "- npx playwright install"
    echo ""
    exit 1
fi