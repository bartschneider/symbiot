# Project Refactor Plan: Fix Critical Communication Failures

## Overview
This document outlines the step-by-step execution plan to fix the catastrophic communication failures between services that render the firecrawl functionality unusable.

## Priority Order: Infrastructure → Database → Integration → Frontend → Error Handling

---

## **PHASE 1: FIX DOCKER INFRASTRUCTURE** 

### 1.1 Fix Docker Service Naming Consistency

~~**File:** `docker-compose.yml`~~
~~- **Change:** Update `postgres` service container name from `synthora-postgres` to `postgres-prod` for consistency with firecrawl expectations.~~

~~**File:** `docker-compose.dev.yml`~~
~~- **Change:** Update `postgres-dev` service container name from `synthora-postgres-dev` to `postgres-dev` to match firecrawl database connection string.~~

~~**File:** `firecrawl-service/src/services/database.js`~~
~~- **Change:** Update default database host from `'postgres-dev'` to use proper environment variable resolution with fallback to `'postgres-dev'` in development and `'postgres-prod'` in production.~~

### 1.2 Fix Docker Network Configuration

~~**File:** `docker-compose.yml`~~
~~- **Change:** Add explicit network configuration to ensure all services can communicate on the same bridge network named `synthora-network`.~~

~~**File:** `docker-compose.dev.yml`~~
~~- **Change:** Add explicit network configuration to ensure all services can communicate on the same bridge network named `sitemap-dev-network`.~~

---

## **PHASE 2: FIX DATABASE CONNECTIONS**

### 2.1 Align Database Configurations

~~**File:** `firecrawl-service/src/config/config.js`~~
~~- **Change:** Update default database configuration to match the actual Docker database service names and credentials used by the main application.~~

~~**File:** `docker-compose.yml`~~
~~- **Change:** Add environment variables for firecrawl service to connect to the correct PostgreSQL instance with proper database name, user, and password.~~

~~**File:** `docker-compose.dev.yml`~~
~~- **Change:** Add environment variables for firecrawl service development configuration to connect to the correct PostgreSQL instance.~~

### 2.2 Create Shared Database Schema

~~**File:** `backend/migrations/002_add_firecrawl_tables.up.sql` (NEW)~~
~~- **Change:** Create new migration file that adds the firecrawl tables (extraction_sessions, url_extractions, extraction_retries) to the main backend database.~~

~~**File:** `backend/migrations/002_add_firecrawl_tables.down.sql` (NEW)~~
~~- **Change:** Create rollback migration to drop the firecrawl tables if needed.~~

~~**File:** `backend/internal/models/extraction.go` (NEW)~~
~~- **Change:** Create Go models for extraction_sessions, url_extractions, and extraction_retries tables to match the database schema.~~

---

## **PHASE 3: INTEGRATE FIRECRAWL INTO BACKEND**

### 3.1 Create Backend Sitemap Handlers

~~**File:** `backend/internal/api/handlers/sitemap_handler.go` (NEW)~~
~~- **Change:** Create new handler file with functions for sitemap discovery, batch extraction, progress tracking, and extraction history management.~~

~~**File:** `backend/internal/services/firecrawl_client.go` (NEW)~~
~~- **Change:** Create HTTP client service to communicate with the firecrawl service from the Go backend, including retry logic and error handling.~~

### 3.2 Add Sitemap Routes to Backend

~~**File:** `backend/internal/api/router.go`~~
~~- **Change:** Add new route group `/api/v1/sitemap` with endpoints for discover, batch extraction, progress tracking, and history management.~~

~~**File:** `backend/internal/config/config.go`~~
~~- **Change:** Add firecrawl service URL configuration with environment variable support for different environments.~~

---

## **PHASE 4: FIX FRONTEND ROUTING**

### 4.1 Redirect Frontend to Backend APIs

**File:** `src/services/sitemapApi.ts`
- **Change:** Update API_BASE_URL from hardcoded `http://localhost:3001` to use backend API base URL and route all calls through `/api/v1/sitemap` endpoints.

**File:** `vite.config.ts`
- **Change:** Add proxy configuration to route `/api` requests to the backend service during development.

### 4.2 Fix Production Proxy Configuration

**File:** `Dockerfile`
- **Change:** Fix nginx proxy configuration to route `/api/` requests to `windchaser-backend:8080` instead of the incorrect `windchaser-backend:3001`.

**File:** `docker-compose.yml`
- **Change:** Update frontend service environment variables to set `VITE_API_BASE_URL` to point to the backend service instead of directly to firecrawl.

**File:** `docker-compose.dev.yml`
- **Change:** Update frontend service environment variables to set `VITE_API_BASE_URL` to point to the backend service during development.

---

## **PHASE 5: ADD ERROR HANDLING & HEALTH CHECKS**

### 5.1 Implement Service Health Monitoring

**File:** `backend/internal/api/handlers/health_handler.go` (NEW)
- **Change:** Create comprehensive health check handler that tests database connectivity, firecrawl service availability, and overall system health.

**File:** `backend/internal/api/router.go`
- **Change:** Update existing health check endpoint to use the new comprehensive health handler and add detailed service status reporting.

### 5.2 Add Frontend Error Boundaries

**File:** `src/hooks/useSitemapDiscovery.ts`
- **Change:** Add comprehensive error handling with specific error types, retry mechanisms, and fallback states for when backend APIs fail.

**File:** `src/hooks/useContentExtraction.ts`
- **Change:** Add error boundary logic with exponential backoff retry, progress recovery, and graceful degradation when extraction services are unavailable.

**File:** `src/components/ui/ErrorBoundary.tsx`
- **Change:** Enhance existing error boundary component to handle sitemap service failures gracefully and provide user-friendly error messages with retry options.

### 5.3 Add Service Circuit Breakers

**File:** `backend/internal/services/circuit_breaker.go` (NEW)
- **Change:** Create circuit breaker implementation to handle firecrawl service failures and prevent cascade failures throughout the system.

**File:** `backend/internal/api/handlers/sitemap_handler.go`
- **Change:** Integrate circuit breaker into sitemap handlers to gracefully handle firecrawl service outages and provide appropriate error responses.

---

## **PHASE 6: ENVIRONMENT CONFIGURATION**

### 6.1 Standardize Environment Variables

**File:** `.env.example` (NEW)
- **Change:** Create example environment file with all required environment variables for all services including database connections, service URLs, and feature flags.

**File:** `backend/.env.example`
- **Change:** Update backend environment example to include firecrawl service URL and database connection parameters.

**File:** `firecrawl-service/.env.example`
- **Change:** Update firecrawl environment example to use the standardized database connection parameters and service URLs.

---

## **EXECUTION ORDER SUMMARY**

1. **PHASE 1** (Infrastructure): Fix Docker service naming and networking
2. **PHASE 2** (Database): Align database configurations and create shared schema
3. **PHASE 3** (Integration): Create backend sitemap APIs and firecrawl client
4. **PHASE 4** (Frontend): Redirect all API calls through backend
5. **PHASE 5** (Resilience): Add error handling and health monitoring
6. **PHASE 6** (Configuration): Standardize environment variables

## **CRITICAL SUCCESS CRITERIA**

- ✅ All services can communicate through Docker networks
- ✅ Firecrawl service connects to correct database
- ✅ Frontend routes all API calls through Go backend
- ✅ Backend provides sitemap/extraction endpoints
- ✅ Error handling prevents cascade failures
- ✅ Health checks verify service availability

## **VALIDATION STEPS**

After completing all phases:
1. Start all services with `docker-compose up`
2. Verify backend health endpoint shows all services healthy
3. Test sitemap discovery through frontend UI
4. Test batch extraction functionality
5. Verify error handling when firecrawl service is stopped
6. Confirm database contains extraction history data

## **ROLLBACK PLAN**

If issues occur during refactor:
1. Revert Docker configuration changes
2. Roll back database migrations using down scripts
3. Restore original frontend API configuration
4. Remove new backend handlers and routes
5. Test original functionality still works