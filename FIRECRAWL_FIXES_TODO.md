# Firecrawl Service Configuration Fixes

## Overview
This document outlines the critical fixes and improvements needed for the firecrawl-service component, identified through comprehensive end-to-end analysis. These fixes address configuration mismatches, hardcoded values, and database initialization issues that prevent proper functioning of the extraction history feature.

## Priority Classification
- 🔴 **CRITICAL**: Blocks functionality
- 🟡 **HIGH**: Impacts reliability
- 🟢 **MEDIUM**: Improves maintainability
- 🔵 **LOW**: Nice to have

---

## 🔴 CRITICAL FIXES

### 1. Database Connection Configuration Mismatch
**File**: `firecrawl-service/src/services/database.js`  
**Lines**: 12-15  
**Issue**: Port configuration not properly parsed from environment variables

**Fix Required**:
```javascript
// Add parseInt to ensure port is a number
port: parseInt(config.database?.port || process.env.DB_PORT) || 5433,
```

**Testing**: Verify database connection with `docker-compose up postgres`

---

### 2. Frontend API URL Hardcoding
**File**: `src/services/sitemapApi.ts`  
**Line**: 14  
**Issue**: API base URL is hardcoded, preventing deployment flexibility

**Fix Required**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
```

**Additional Steps**:
- Add `VITE_API_BASE_URL=http://localhost:3001` to `.env.example`
- Update Docker compose to pass this environment variable

---

### 3. PostgreSQL Schema Syntax Errors
**File**: `firecrawl-service/database/init/01-init-database.sql`  
**Lines**: 5-8  
**Issue**: Invalid SQL syntax for conditional user/database creation

**Fix Required**:
```sql
-- Replace CREATE USER IF NOT EXISTS with:
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'firecrawl_user') THEN
    CREATE USER firecrawl_user WITH PASSWORD 'firecrawl_password';
  END IF;
END
$$;

-- Replace CREATE DATABASE IF NOT EXISTS with:
SELECT 'CREATE DATABASE firecrawl_db OWNER firecrawl_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'firecrawl_db')\gexec
```

---

## 🟡 HIGH PRIORITY FIXES

### 4. Missing Database Requirement Check
**File**: `firecrawl-service/src/app.js`  
**Lines**: 195-202  
**Issue**: App continues without database but extraction history will fail

**Fix Required**:
```javascript
// Add after line 200
if (process.env.REQUIRE_DATABASE === 'true') {
  console.error('Database is required. Exiting...');
  process.exit(1);
}
```

---

### 5. CORS Configuration for Multiple Origins
**File**: `firecrawl-service/src/middleware/security.js`  
**Issue**: CORS doesn't support multiple frontend ports

**Fix Required**:
```javascript
export const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || 
      ['http://localhost:3030', 'http://localhost:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  // ... rest of config
};
```

---

## 🟢 MEDIUM PRIORITY IMPROVEMENTS

### 6. Comprehensive Environment Configuration
**File**: Create `firecrawl-service/.env.production`  
**Issue**: Missing production-ready environment template

**Create New File**:
```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=firecrawl_db
DB_USER=firecrawl_user
DB_PASSWORD=${DB_PASSWORD}
REQUIRE_DATABASE=true

# API Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# Frontend Configuration
CORS_ORIGIN=${FRONTEND_URL}

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Playwright Configuration
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_MAX_CONCURRENT=3
```

---

### 7. Docker Compose Network Alignment
**File**: `docker-compose.yml` and `firecrawl-service/docker-compose.db.yml`  
**Issue**: Inconsistent network naming between services

**Fix Required**:
- Ensure all services use `sitemap-network` consistently
- Remove `external: true` from db compose file
- Add health check dependencies

---

### 8. Database Connection Retry Logic
**File**: `firecrawl-service/src/services/database.js`  
**New Feature**: Add connection retry with exponential backoff

**Add Function**:
```javascript
const connectWithRetry = async (maxRetries = 5, delay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initDatabase();
      return;
    } catch (error) {
      console.log(`Database connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};
```

---

## 🔵 LOW PRIORITY ENHANCEMENTS

### 9. Add Environment Validation
**File**: Create `firecrawl-service/src/utils/validateEnv.js`  
**Purpose**: Validate required environment variables on startup

```javascript
export const validateEnvironment = () => {
  const required = ['JWT_SECRET', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

---

### 10. Improve Error Messages
**File**: `firecrawl-service/src/services/extractionHistory.js`  
**Enhancement**: Add more descriptive error messages for common failures

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Database connects successfully with Docker
- [ ] Frontend can reach backend API
- [ ] Extraction history creates sessions
- [ ] URL extractions are recorded
- [ ] Retry functionality works
- [ ] CORS allows frontend connections
- [ ] Environment variables are properly loaded
- [ ] Docker compose brings up all services
- [ ] Health checks pass for all services
- [ ] PostgreSQL schema initializes without errors

## Deployment Notes

1. **Environment Variables**: Ensure all `.env` files are created from templates
2. **Database Migration**: Run init script before first deployment
3. **Docker Networks**: Create network before starting services
4. **Port Availability**: Verify ports 3001, 3030, 5433 are available
5. **Secrets Management**: Never commit actual passwords or secrets

## Commands for Testing

```bash
# Start database only
docker-compose -f firecrawl-service/docker-compose.db.yml up postgres

# Test database connection
psql -h localhost -p 5433 -U firecrawl_user -d firecrawl_db

# Start all services
docker-compose up

# Run backend locally
cd firecrawl-service && npm run dev

# Run frontend locally
npm run dev

# Check service health
curl http://localhost:3001/health
curl http://localhost:3001/api/extraction-history/health
```

## Git Workflow

```bash
# Work in the fixes worktree
cd ../stocks_out_for_harambe-fixes

# Create atomic commits for each fix
git add -p
git commit -m "fix: resolve database port parsing issue"

# Push when ready
git push -u origin fix/firecrawl-config-improvements

# Create PR for review
gh pr create --title "Fix firecrawl service configuration issues" \
  --body "Resolves database connection, CORS, and environment configuration issues"
```

---

*Generated: 2025-08-06*  
*Branch: fix/firecrawl-config-improvements*  
*Worktree: ../stocks_out_for_harambe-fixes*