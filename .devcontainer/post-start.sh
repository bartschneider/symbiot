#!/bin/bash
# Dev Container Post-Start Script
# Runs every time the container starts

set -e

echo "🌟 Starting Knowledge Graph Platform services..."

# Wait for dependencies to be ready
echo "⏳ Waiting for services to be healthy..."
timeout 120 bash -c 'until curl -f http://postgres-testing:5432 2>/dev/null; do sleep 2; done' || echo "⚠️  PostgreSQL check timeout"
timeout 120 bash -c 'until curl -f http://redis-testing:6379 2>/dev/null; do sleep 2; done' || echo "⚠️  Redis check timeout"
timeout 120 bash -c 'until curl -f http://firecrawl-service:3001/health 2>/dev/null; do sleep 2; done' || echo "⚠️  API service check timeout"

# Update database schema if needed
echo "🗄️  Syncing database schema..."
npx prisma db push --skip-generate

# Check Playwright browser installation
echo "🎭 Verifying Playwright browsers..."
if ! npx playwright --version &>/dev/null; then
    echo "📦 Reinstalling Playwright browsers..."
    npx playwright install
fi

# Create runtime directories
mkdir -p test-results/current
mkdir -p logs

# Display service status
echo "📊 Service Status:"
echo "  ✅ Dev Container: Ready"
echo "  🌐 Next.js Dev Server: http://localhost:5173"
echo "  🔧 API Backend: http://localhost:3001"
echo "  🏥 Health Dashboard: http://localhost:8080"
echo "  🎭 Playwright Debug: http://localhost:9323"

# Start background services if needed
if [ "$AUTO_START_DEV" = "true" ]; then
    echo "🚀 Auto-starting development server..."
    nohup npm run dev > logs/dev-server.log 2>&1 &
fi

echo "✅ Dev Container is ready for development!"
echo ""
echo "🎯 Quick Start:"
echo "   npm run dev                    # Start development server"
echo "   npm run test:e2e              # Run all E2E tests"
echo "   npm run test:e2e:ui           # Open Playwright test UI"
echo ""
echo "🧪 Test Scenarios Available:"
echo "   npm run test:e2e:smoke        # Quick smoke tests"
echo "   npm run test:e2e:performance  # Performance validation"
echo "   npx playwright test phase35-vertex-ai.spec.ts  # Phase 3.5 LLM tests"
echo ""
echo "🔍 Debug & Monitor:"
echo "   health:check                  # Check all service health"
echo "   logs:api                      # View API logs"
echo "   logs:db                       # View database logs"