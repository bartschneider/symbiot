#!/bin/bash
# Dev Container Initialization Script
# Runs on the host before container creation

set -e

echo "🚀 Initializing Knowledge Graph Platform Dev Container..."

# Check for required environment variables
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo "⚠️  GOOGLE_CLOUD_PROJECT environment variable not set"
    echo "   Setting default for development..."
    export GOOGLE_CLOUD_PROJECT="kgp-dev-project"
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "DATABASE_URL=postgresql://postgres:testing-password@postgres-testing:5432/knowledge_platform_dev?schema=public" >> .env.local
    echo "NEXTAUTH_SECRET=dev-container-secret-not-for-production" >> .env.local
    echo "NEXTAUTH_URL=http://localhost:5173" >> .env.local
fi

# Ensure test-results directory exists
mkdir -p test-results

# Pull required Docker images in advance for faster startup
echo "📦 Pre-pulling Docker images..."
docker pull node:20-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine

echo "✅ Dev Container initialization complete!"
echo "💡 You can now open this project in VS Code with 'Dev Containers: Reopen in Container'"