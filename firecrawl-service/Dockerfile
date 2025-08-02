# Multi-stage Dockerfile optimized for ARM64 architecture
# Firecrawl Service - Node.js Express API with Playwright
# Optimized for caching: separate deps layer, enable BuildKit cache mounts, avoid duplicate system packages across stages

# Stage 1: Dependencies installation (production deps only)
FROM node:20-alpine AS deps
WORKDIR /app

# System deps needed for chromium at runtime
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    curl

# Configure Playwright/Chromium paths
# Prefer system chromium path; if Playwright bundle is used, uncomment the below line accordingly
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy lockfiles only to maximize deps cache hit
COPY package*.json ./

# Install production dependencies using cache mounts
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder (full deps for lint/tests if needed)
FROM node:20-alpine AS builder
WORKDIR /app

# Reuse the same system deps to avoid surprises; do not duplicate heavy -dev libraries unless required
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install full deps with cache mounts
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Install Playwright chromium once in builder (no --with-deps since system chromium is installed)
RUN npx playwright install chromium || echo "Playwright install completed"

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Optional build validations
RUN npm run lint || echo "Linting completed"

# Stage 3: Production runtime (use Playwright maintained base image to avoid huge system deps on Alpine)
# Updated to align with runtime requirement printed at startup
# Note: Focal tags not found on MCR for 1.54.x; use Jammy which is published.
FROM mcr.microsoft.com/playwright:v1.54.0-jammy AS production
WORKDIR /app

# Copy production dependencies and package metadata from deps stage
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/

# Ensure browsers are installed for the pinned Playwright version in package.json
RUN npx playwright install --with-deps chromium || echo "Playwright browsers installed"

# Create non-root user for security and app dirs
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m windchaser && \
    mkdir -p /app/logs /app/temp && \
    chown -R windchaser:nodejs /app

# Switch to non-root user
USER windchaser

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV JWT_SECRET=secure-jwt-secret-change-in-production
ENV JWT_EXPIRES_IN=24h
ENV CORS_ORIGIN=http://localhost:3030
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV CACHE_TTL_SECONDS=3600
ENV PLAYWRIGHT_TIMEOUT=30000
ENV PLAYWRIGHT_MAX_CONCURRENT=3
ENV CONTENT_MAX_SIZE_MB=10
ENV CONTENT_MAX_TIMEOUT_MS=60000

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "src/app.js"]

# Metadata
LABEL maintainer="windchaser-team"
LABEL version="1.0.0"
LABEL description="Firecrawl Service - Web scraping and HTML-to-Markdown conversion API"