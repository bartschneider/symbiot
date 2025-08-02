# Multi-stage Dockerfile for Main React Application
# Optimized for ARM64 architecture

# Stage 1: Dependencies installation
FROM --platform=linux/arm64 node:20-alpine AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    git \
    curl \
    bash

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies with ARM64 optimizations
RUN npm ci --only=production --platform=linux --arch=arm64 && \
    npm cache clean --force

# Stage 2: Development dependencies and build
FROM --platform=linux/arm64 node:20-alpine AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    git \
    curl \
    bash \
    python3 \
    make \
    g++

# Copy package files and install all dependencies
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

RUN npm ci --platform=linux --arch=arm64

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Set environment variables for build
ENV NODE_ENV=production
ENV VITE_API_BASE_URL=http://localhost:3001
ENV VITE_APP_NAME="Synthora Analytics"

# Run build process
RUN npm run build

# Stage 3: Production runtime
FROM --platform=linux/arm64 nginx:alpine AS production

# Install Node.js for potential server-side features
RUN apk add --no-cache nodejs npm curl

# Copy nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Main application
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy to backend service
    location /api/ {
        proxy_pass http://firecrawl-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy production package.json for potential runtime needs
COPY --from=deps /app/package.json /app/package.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S synthora -u 1001 -G nodejs

# Create nginx directories and set permissions
RUN mkdir -p /var/run/nginx /var/cache/nginx/client_temp && \
    chown -R synthora:nodejs /usr/share/nginx/html && \
    chown -R synthora:nodejs /var/cache/nginx && \
    chown -R synthora:nodejs /var/log/nginx && \
    chown -R synthora:nodejs /etc/nginx/conf.d && \
    chown -R synthora:nodejs /var/run/nginx && \
    touch /var/run/nginx/nginx.pid && \
    chown synthora:nodejs /var/run/nginx/nginx.pid

# Create custom nginx.conf for non-root user  
COPY <<EOF /etc/nginx/nginx.conf
pid /var/run/nginx/nginx.pid;
worker_processes auto;
error_log /var/log/nginx/error.log notice;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Switch to non-root user
USER synthora

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Metadata
LABEL maintainer="synthora-team"
LABEL version="1.0.0"
LABEL description="Synthora Analytics - React TypeScript application with integrated sitemap analysis"
LABEL architecture="arm64"