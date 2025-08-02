# Multi-stage Dockerfile for Go backend (optimized caching and build speed)

# Stage 1: Build stage
FROM golang:1.21.10-alpine3.19 AS builder

# Install git and ca-certificates (required for fetching dependencies)
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory inside container
WORKDIR /app

# Leverage Docker layer caching by isolating module download
# Copy only go.mod and go.sum first; if go.sum is missing in repo, copy will still succeed by using .dockerignore to avoid noise
COPY go.mod ./
# Copy go.sum if present; if absent, create an empty one to keep cache stable
# hadolint ignore=DL3018
RUN [ -f go.sum ] || echo "" > go.sum
COPY go.sum ./

# Download dependencies with BuildKit caches for module + build cache
# - Keep this layer stable so subsequent source changes don't invalidate it
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

# Copy only source directories that affect the build to minimize cache busting
# Adjust if additional packages exist
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY migrations/ ./migrations/

# Build the application
# Remove '-a' to avoid forcing rebuild of stdlib for faster dev-like builds while mirroring prod multi-stage layout
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -installsuffix cgo -o server ./cmd/server

# Stage 2: Runtime stage
FROM alpine:3.19

# Install ca-certificates and curl for health checks
# Diagnostics: print architecture to help detect platform mismatches at build time
RUN echo "Backend runtime arch: $(uname -m)" && \
    apk --print-arch && \
    apk --no-cache add ca-certificates curl

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/server .

# Copy migration files
COPY --from=builder /app/migrations ./migrations

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Change ownership to appuser
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["./server"]