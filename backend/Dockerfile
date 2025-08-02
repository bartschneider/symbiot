# Multi-stage Dockerfile for Go backend (handles missing go.sum and subpath module files)

# Stage 1: Build stage
FROM golang:1.21-alpine AS builder

# Install git and ca-certificates (required for fetching dependencies)
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory inside container
WORKDIR /app

# Copy module files from backend subpath first to leverage Docker build cache
COPY go.mod ./go.mod
# If go.sum doesn't exist in repo, create an empty one to satisfy COPY and allow tidy to generate it
# Use --chown not needed on Alpine; simply touch later
# Attempt to copy; if not present, create empty
# We do this in two steps to keep caching effective
# Copy will fail if file doesn't exist, so we use a conditional touch before the next commands
# Instead, we copy only go.mod here, and create go.sum via tidy below

# Download dependencies (this will also create go.sum via 'go mod tidy' if missing)
RUN --mount=type=cache,target=/go/pkg/mod \
    test -f go.sum || true && \
    go mod tidy && \
    go mod download

# Copy the rest of the backend source
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Stage 2: Runtime stage
FROM alpine:latest

# Install ca-certificates and curl for health checks
RUN apk --no-cache add ca-certificates curl

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