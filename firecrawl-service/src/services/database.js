import { Pool } from 'pg';
import { config } from '../config/config.js';

/**
 * PostgreSQL Database Service
 * Manages database connections with connection pooling and error handling
 */

let pool = null;

// Database configuration
const dbConfig = {
  // Support both docker and local development
  host: config.database?.host || process.env.DB_HOST || 'localhost',
  port: parseInt(config.database?.port || process.env.DB_PORT) || 5433,
  database: config.database?.name || process.env.DB_NAME || 'windchaser_db',
  user: config.database?.user || process.env.DB_USER || 'windchaser_user',
  password: config.database?.password || process.env.DB_PASSWORD || 'windchaser_password',
  
  // Connection pool settings
  min: parseInt(config.database?.pool?.min || process.env.DATABASE_POOL_MIN) || 2,
  max: parseInt(config.database?.pool?.max || process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(config.database?.pool?.idleTimeout || process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(config.database?.connectionTimeout || process.env.DATABASE_CONNECTION_TIMEOUT) || 60000,
  
  // Query settings
  query_timeout: parseInt(config.database?.queryTimeout || process.env.DATABASE_QUERY_TIMEOUT) || 30000,
  
  // SSL settings (disabled for development)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Application settings
  application_name: 'windchaser-service',
  
  // Error handling
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

/**
 * Connect to database with retry logic and exponential backoff
 */
export const connectWithRetry = async (maxRetries = 5, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxRetries}...`);
      pool = new Pool(dbConfig);
      
      // Test connection immediately
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log(`✅ Database connection successful on attempt ${attempt}`);
      return pool;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
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

/**
 * Initialize database connection pool
 */
export const initDatabase = async () => {
  try {
    if (pool) {
      console.log('Database pool already initialized');
      return pool;
    }

    console.log('Initializing database connection pool...');
    console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // Use retry logic for initial connection
    await connectWithRetry();
    
    // Handle pool events
    pool.on('connect', (client) => {
      console.log(`Database client connected (PID: ${client.processID})`);
    });
    
    pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
      
      // Attempt to recreate pool with retry logic on critical errors
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        console.log('Attempting to recreate database pool with retry logic...');
        setTimeout(() => {
          pool = null;
          initDatabase().catch(error => {
            console.error('Failed to recreate database pool:', error.message);
          });
        }, 5000);
      }
    });
    
    pool.on('remove', (client) => {
      console.log(`Database client removed (PID: ${client.processID})`);
    });
    
    // Get additional connection info
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as connected_at, version() as version');
    client.release();
    
    console.log('Database connection successful:', {
      connectedAt: result.rows[0].connected_at,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      poolConfig: {
        min: dbConfig.min,
        max: dbConfig.max,
        idleTimeout: dbConfig.idleTimeoutMillis,
        connectionTimeout: dbConfig.connectionTimeoutMillis,
        queryTimeout: dbConfig.query_timeout
      }
    });
    
    return pool;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
};

/**
 * Get database connection pool
 */
export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic client management
 */
export const query = async (text, params = []) => {
  const client = await getPool().connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params.length > 0 ? `${params.length} params` : 'no params',
        duration
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params.length > 0 ? `${params.length} params` : 'no params'
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute multiple queries in a transaction
 */
export const transaction = async (queries) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a client for manual transaction management
 */
export const getClient = async () => {
  return await getPool().connect();
};

/**
 * Health check for database connection
 */
export const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as health, NOW() as timestamp');
    const poolStats = getPool().totalCount;
    
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      pool: {
        totalConnections: getPool().totalCount,
        idleConnections: getPool().idleCount,
        waitingClients: getPool().waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Close database connection pool
 */
export const closeDatabase = async () => {
  if (pool) {
    console.log('Closing database connection pool...');
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
};

/**
 * Get database statistics
 */
export const getStatistics = async () => {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const poolStats = {
      totalConnections: getPool().totalCount,
      idleConnections: getPool().idleCount,
      waitingClients: getPool().waitingCount
    };
    
    return {
      pool: poolStats,
      tables: stats.rows
    };
  } catch (error) {
    console.error('Failed to get database statistics:', error);
    throw error;
  }
};

/**
 * Escape identifiers for dynamic queries
 */
export const escapeIdentifier = (identifier) => {
  return `"${identifier.replace(/"/g, '""')}"`;
};

/**
 * Build WHERE clause from filters
 */
export const buildWhereClause = (filters, startIndex = 1) => {
  const conditions = [];
  const values = [];
  let paramIndex = startIndex;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${escapeIdentifier(key)} IN (${placeholders})`);
        values.push(...value);
      } else if (typeof value === 'string' && value.includes('%')) {
        conditions.push(`${escapeIdentifier(key)} LIKE $${paramIndex++}`);
        values.push(value);
      } else {
        conditions.push(`${escapeIdentifier(key)} = $${paramIndex++}`);
        values.push(value);
      }
    }
  });
  
  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    nextIndex: paramIndex
  };
};

/**
 * Build pagination clause
 */
export const buildPaginationClause = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    clause: `LIMIT ${limit} OFFSET ${offset}`,
    offset,
    limit
  };
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDatabase();
  process.exit(0);
});

export default {
  initDatabase,
  getPool,
  query,
  transaction,
  getClient,
  healthCheck,
  closeDatabase,
  getStatistics,
  escapeIdentifier,
  buildWhereClause,
  buildPaginationClause,
  connectWithRetry
};