#!/bin/bash
# Dev Container Post-Create Script
# Runs inside the container after it's created

set -e

echo "🔧 Setting up Knowledge Graph Platform development environment..."

# Install project dependencies
echo "📦 Installing project dependencies..."
npm ci

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

# Set up database
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

# Create test directories
mkdir -p test-results/screenshots
mkdir -p test-results/videos
mkdir -p test-results/traces

# Set up git configuration for the container
git config --global --add safe.directory /workspace

# Set up shell aliases and environment
echo "🐚 Configuring shell environment..."
cat >> ~/.zshrc << 'EOF'
# Knowledge Graph Platform Development Aliases
alias dev="npm run dev"
alias build="npm run build"
alias test="npm run test:e2e"
alias test:headed="npm run test:e2e:headed"
alias test:debug="npm run test:e2e:debug"
alias test:ui="npm run test:e2e:ui"
alias pw="npx playwright"
alias prisma="npx prisma"

# Environment setup
export NODE_ENV=development
export PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Helper functions
test:smoke() {
    echo "🚀 Running smoke tests..."
    npm run test:e2e:smoke
}

test:performance() {
    echo "⚡ Running performance tests..."
    npm run test:e2e:performance
}

test:phase35() {
    echo "🧠 Running Phase 3.5 LLM tests..."
    npx playwright test tests/e2e/phase35-vertex-ai.spec.ts
}

health:check() {
    echo "🏥 Checking service health..."
    curl -f http://localhost:5173 && echo "✅ Frontend OK"
    curl -f http://localhost:3001/health && echo "✅ API OK"
    curl -f http://localhost:8080 && echo "✅ Health Dashboard OK"
}

logs:api() {
    docker-compose -f docker-compose.user-testing.yml logs -f firecrawl-service
}

logs:db() {
    docker-compose -f docker-compose.user-testing.yml logs -f postgres-testing
}
EOF

# Initialize Playwright configuration
echo "🎭 Configuring Playwright for dev container..."
cat > playwright.config.local.ts << 'EOF'
import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:5173',
    headless: process.env.HEADLESS !== 'false',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: undefined  // Disable webServer in dev container as services run separately
})
EOF

echo "✅ Dev Container setup complete!"
echo "🎯 Available commands:"
echo "   - dev                : Start Next.js development server"
echo "   - test               : Run E2E tests"
echo "   - test:debug         : Run tests in debug mode"
echo "   - test:smoke         : Run smoke tests"
echo "   - test:performance   : Run performance tests"
echo "   - test:phase35       : Run Phase 3.5 LLM tests"
echo "   - health:check       : Check all service health"
echo "   - pw test --ui       : Open Playwright test UI"