# Database Connection and SSL Configuration Fixes

## Critical Issues and Solutions

### 1. SSL Configuration Fix

**Problem**: SSL connection mismatch between client and server configurations

**Solution**: Update database connection configurations to consistently disable SSL for development

#### A. Update Prisma Schema
```typescript
// In .env or .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/synthora_dev?sslmode=disable"
```

#### B. Update Firecrawl Service Database Configuration
```javascript
// In firecrawl-service/src/services/database.js
const dbConfig = {
  host: config.database?.host || process.env.DB_HOST || 'localhost',
  port: parseInt(config.database?.port || process.env.DB_PORT) || 5432,
  database: config.database?.name || process.env.DB_NAME || 'synthora_dev',
  user: config.database?.user || process.env.DB_USER || 'postgres',
  password: config.database?.password || process.env.DB_PASSWORD || 'password',
  
  // SSL settings - FIXED: Consistent SSL configuration
  ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
  sslmode: process.env.DB_SSL_MODE || 'disable',
  
  // Connection pool settings
  min: parseInt(config.database?.pool?.min || process.env.DATABASE_POOL_MIN) || 2,
  max: parseInt(config.database?.pool?.max || process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(config.database?.pool?.idleTimeout || process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(config.database?.connectionTimeout || process.env.DATABASE_CONNECTION_TIMEOUT) || 60000,
  
  // Application settings
  application_name: 'windchaser-service',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};
```

#### C. Update Environment Variables
```bash
# Add to .env.example and all .env files
DB_SSL_MODE=disable

# For production, use:
# DB_SSL_MODE=require
```

### 2. Standardize Database Configuration

**Problem**: Inconsistent database names and connection strings across services

**Solution**: Create unified database configuration

#### A. Update Main .env.example
```bash
# Unified Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/synthora_dev?sslmode=disable"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=synthora_dev
DB_USER=postgres
DB_PASSWORD=password
DB_SSL_MODE=disable

# For Docker Compose
DATABASE_URL="postgresql://postgres:password@postgres:5432/synthora_dev?sslmode=disable"
```

#### B. Update Docker Compose
```yaml
# In docker-compose.yml - ensure consistent database configuration
services:
  postgres:
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: synthora_dev
      
  frontend:
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/synthora_dev?sslmode=disable
      
  firecrawl-service:
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=synthora_dev
      - DB_USER=postgres
      - DB_PASSWORD=password
      - DB_SSL_MODE=disable
```

### 3. Enhanced Error Handling and Fallback

**Problem**: Limited fallback behavior and unclear error messages

**Solution**: Implement comprehensive error handling with proper fallback

#### A. Enhanced Database Service with Better Error Handling
```javascript
// In firecrawl-service/src/services/database.js - Add better error handling
export const connectWithRetry = async (maxRetries = 5, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxRetries}...`);
      
      // Create pool with enhanced configuration
      pool = new Pool({
        ...dbConfig,
        // Enhanced SSL error handling
        ssl: dbConfig.ssl,
        // Explicit SSL mode parameter
        options: dbConfig.sslmode ? `-c sslmode=${dbConfig.sslmode}` : undefined,
      });
      
      // Test connection immediately
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log(`✅ Database connection successful on attempt ${attempt}`);
      return pool;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
      // Enhanced SSL-specific error handling
      if (error.message.includes('SSL') || error.message.includes('ssl')) {
        console.error('🔒 SSL Connection Issue Detected:');
        console.error('   - Check DB_SSL_MODE environment variable');
        console.error('   - For development: DB_SSL_MODE=disable');
        console.error('   - For production: DB_SSL_MODE=require');
        console.error(`   - Current SSL config: ${JSON.stringify(dbConfig.ssl)}`);
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Close any partial connection
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          // Ignore errors when closing failed connections
        }
        pool = null;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

#### B. Enhanced Application Startup with Database Health Check
```javascript
// In firecrawl-service/src/app.js - Enhanced database initialization
const initializeDatabase = async () => {
  const databaseRequired = process.env.DATABASE_REQUIRED === 'true';
  const requiredByFeatures = process.env.REQUIRE_DATABASE !== 'false'; // Default true
  
  try {
    await initDatabase();
    console.log('✅ Database connection established');
    global.databaseAvailable = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    global.databaseAvailable = false;
    
    // Enhanced error reporting
    if (error.message.includes('SSL')) {
      console.error('🔒 SSL Configuration Issue:');
      console.error('   - Check database SSL settings');
      console.error('   - Set DB_SSL_MODE=disable for development');
      console.error('   - Ensure database server SSL configuration matches client');
    }
    
    if (databaseRequired || requiredByFeatures) {
      console.error('🚨 Database is required but unavailable. Application cannot start.');
      console.error('   Check database connection and ensure PostgreSQL is running.');
      console.error('   Connection details: postgresql://[user]:[password]@[host]:[port]/[database]');
      console.error('   Set REQUIRE_DATABASE=false to make database optional');
      process.exit(1);
    } else {
      console.log('⚠️  Application will continue without database features');
      console.log('   Set DATABASE_REQUIRED=true to make database mandatory');
      console.log('   Some features may not work correctly without database');
      return false;
    }
  }
};
```

### 4. Implement Mock Data System

**Problem**: No fallback data when database is unavailable

**Solution**: Create mock data system for development and testing

#### A. Create Mock Data Service
```javascript
// Create: firecrawl-service/src/services/mockData.js
export const mockExtractionSessions = [
  {
    id: 'mock-session-1',
    userId: 'dev-user',
    sessionName: 'Mock Session 1',
    sourceUrl: 'https://example.com',
    totalUrls: 10,
    successfulUrls: 8,
    failedUrls: 2,
    status: 'completed',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:05:00Z'),
    processingTimeMs: 300000
  },
  {
    id: 'mock-session-2',
    userId: 'dev-user',
    sessionName: 'Mock Session 2',
    sourceUrl: 'https://test.com',
    totalUrls: 25,
    successfulUrls: 20,
    failedUrls: 5,
    status: 'processing',
    createdAt: new Date('2024-01-02T14:30:00Z'),
    completedAt: null,
    processingTimeMs: null
  }
];

export const mockUrlExtractions = [
  {
    id: 'mock-url-1',
    sessionId: 'mock-session-1',
    url: 'https://example.com/page1',
    status: 'completed',
    httpStatusCode: 200,
    contentSizeBytes: 1024,
    processingTimeMs: 1500,
    createdAt: new Date('2024-01-01T10:01:00Z'),
    processedAt: new Date('2024-01-01T10:01:15Z')
  }
];

export class MockExtractionHistoryService {
  async createExtractionSession(userId, sourceUrl, options = {}) {
    const mockSession = {
      id: `mock-${Date.now()}`,
      userId,
      sourceUrl,
      sessionName: options.sessionName || `Mock Session - ${new Date().toISOString().split('T')[0]}`,
      totalUrls: options.totalUrls || 0,
      successfulUrls: 0,
      failedUrls: 0,
      status: 'processing',
      chunkSize: options.chunkSize || 25,
      maxRetries: options.maxRetries || 3,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
      processingTimeMs: null
    };
    
    console.log('📋 Created mock extraction session:', mockSession.id);
    return mockSession;
  }
  
  async getExtractionSessions(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const filteredSessions = mockExtractionSessions.filter(session => {
      if (filters.status && session.status !== filters.status) return false;
      if (filters.sourceUrl && !session.sourceUrl.includes(filters.sourceUrl)) return false;
      return true;
    });
    
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      sessions: filteredSessions.slice(start, end),
      total: filteredSessions.length,
      page,
      limit,
      pages: Math.ceil(filteredSessions.length / limit)
    };
  }
}
```

#### B. Update API Routes to Use Mock Data
```javascript
// Update: src/app/api/extraction-history/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MockExtractionHistoryService } from '@/lib/services/mockData'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const status = searchParams.get('status')
    const sourceUrl = searchParams.get('sourceUrl')

    // Check if database is available
    const databaseAvailable = global.databaseAvailable !== false;
    
    if (!databaseAvailable) {
      console.log('📋 Using mock data - database unavailable');
      const mockService = new MockExtractionHistoryService();
      const result = await mockService.getExtractionSessions(
        { status, sourceUrl },
        { page, limit }
      );
      
      return NextResponse.json({
        success: true,
        data: {
          sessions: result.sessions,
          pagination: result
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `mock-sessions-${Date.now()}`,
          source: 'mock-data'
        }
      });
    }

    // Original database logic here...
    // [Keep existing code for when database is available]
    
  } catch (error) {
    console.error('Get sessions error:', error)
    
    // Fallback to mock data on database errors
    console.log('📋 Falling back to mock data due to database error');
    const mockService = new MockExtractionHistoryService();
    const result = await mockService.getExtractionSessions({}, { page: 1, limit: 10 });
    
    return NextResponse.json({
      success: true,
      data: {
        sessions: result.sessions,
        pagination: result
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `fallback-sessions-${Date.now()}`,
        source: 'mock-data-fallback',
        warning: 'Database unavailable, using mock data'
      }
    });
  }
}
```

### 5. Database Connection Validation Script

**Create comprehensive database testing utility**

```bash
# Create: scripts/test-database-connection.sh
#!/bin/bash

echo "🔍 Database Connection Diagnostic Tool"
echo "======================================"

# Test environment variables
echo "1. Environment Variables:"
echo "   DATABASE_URL: ${DATABASE_URL:-'NOT SET'}"
echo "   DB_HOST: ${DB_HOST:-'NOT SET'}"
echo "   DB_PORT: ${DB_PORT:-'NOT SET'}"
echo "   DB_NAME: ${DB_NAME:-'NOT SET'}"
echo "   DB_USER: ${DB_USER:-'NOT SET'}"
echo "   DB_SSL_MODE: ${DB_SSL_MODE:-'NOT SET'}"
echo ""

# Test PostgreSQL availability
echo "2. PostgreSQL Server Test:"
if command -v pg_isready &> /dev/null; then
    pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres}
    if [ $? -eq 0 ]; then
        echo "   ✅ PostgreSQL server is ready"
    else
        echo "   ❌ PostgreSQL server is not ready"
    fi
else
    echo "   ⚠️  pg_isready not available, skipping server test"
fi
echo ""

# Test SSL configuration
echo "3. SSL Configuration Test:"
if [ "${DB_SSL_MODE}" = "disable" ]; then
    echo "   ✅ SSL disabled (recommended for development)"
elif [ "${DB_SSL_MODE}" = "require" ]; then
    echo "   🔒 SSL required (recommended for production)"
else
    echo "   ⚠️  SSL mode not explicitly set (may cause connection issues)"
fi
echo ""

# Test database connection
echo "4. Database Connection Test:"
if [ -n "${DATABASE_URL}" ]; then
    if command -v psql &> /dev/null; then
        psql "${DATABASE_URL}" -c "SELECT 1 as connection_test, NOW() as timestamp;" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✅ Database connection successful"
        else
            echo "   ❌ Database connection failed"
            echo "   💡 Try: psql \"${DATABASE_URL}\" to debug manually"
        fi
    else
        echo "   ⚠️  psql not available, skipping connection test"
    fi
else
    echo "   ❌ DATABASE_URL not set"
fi
echo ""

# Test application database service
echo "5. Application Database Service Test:"
if [ -f "firecrawl-service/test-db-connection.js" ]; then
    cd firecrawl-service && node test-db-connection.js
else
    echo "   ⚠️  Database test script not found"
fi
```

### 6. Production Deployment Recommendations

#### A. Environment Variable Template
```bash
# Production .env template
NODE_ENV=production
DATABASE_URL="postgresql://user:password@localhost:5432/synthora_prod?sslmode=require"
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=synthora_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_SSL_MODE=require
DATABASE_REQUIRED=true
REQUIRE_DATABASE=true

# Connection pool settings for production
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_QUERY_TIMEOUT=30000
```

#### B. SSL Certificate Setup for Production
```bash
# For production with SSL certificates
DB_SSL_MODE=require
# Add SSL certificate paths if using custom certificates
# DB_SSL_CERT=/path/to/client-cert.pem
# DB_SSL_KEY=/path/to/client-key.pem
# DB_SSL_CA=/path/to/ca-cert.pem
```

## Implementation Priority

1. **High Priority**: Fix SSL configuration (immediate)
2. **High Priority**: Standardize database configuration (immediate)
3. **Medium Priority**: Implement mock data system (development)
4. **Medium Priority**: Enhanced error handling (stability)
5. **Low Priority**: Connection validation scripts (convenience)

## Testing Checklist

- [ ] Database connects without SSL errors
- [ ] Application starts with database unavailable
- [ ] Mock data serves when database down
- [ ] All environment variables consistent
- [ ] Docker Compose works with fixes
- [ ] Production SSL configuration tested
- [ ] Connection pooling works correctly
- [ ] Error messages are clear and actionable