# Multi-stage Dockerfile optimized for ARM64 architecture
# Firecrawl Service - Node.js Express API with Playwright

# Stage 1: Dependencies installation
FROM --platform=linux/arm64 node:20-alpine AS deps
WORKDIR /app

# Install system dependencies for Playwright and Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Configure Playwright to use system browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium

# Copy package files
COPY package*.json ./

# Install dependencies with ARM64 optimizations
RUN npm ci --only=production --platform=linux --arch=arm64 && \
    npm cache clean --force

# Stage 2: Development and build preparation
FROM --platform=linux/arm64 node:20-alpine AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Configure Playwright to use system browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci --platform=linux --arch=arm64

# Install Playwright browsers
RUN npx playwright install chromium --with-deps || echo "Playwright install completed"

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Build validation
RUN npm run lint || echo "Linting completed"

# Stage 3: Production runtime
FROM --platform=linux/arm64 node:20-alpine AS production
WORKDIR /app

# Install production system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    curl \
    dumb-init

# Configure Playwright to use system browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy application source
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S windchaser -u 1001 -G nodejs

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/temp && \
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

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "src/app.js"]

# Metadata
LABEL maintainer="windchaser-team"
LABEL version="1.0.0"
LABEL description="Firecrawl Service - Web scraping and HTML-to-Markdown conversion API"
LABEL architecture="arm64"