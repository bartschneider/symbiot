import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Cache Configuration
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 3600
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // Playwright Configuration
  playwright: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT) || 30000,
    maxConcurrent: parseInt(process.env.PLAYWRIGHT_MAX_CONCURRENT) || 3
  },
  
  // Content Limits
  content: {
    maxSizeMB: parseInt(process.env.MAX_CONTENT_SIZE_MB) || 10,
    maxTimeoutMs: parseInt(process.env.MAX_REQUEST_TIMEOUT_MS) || 60000
  },
  
  // API Configuration
  api: {
    keyHeader: process.env.API_KEY_HEADER || 'X-API-Key'
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://windchaser_user:secure_password_change_me@localhost:5432/windchaser_db',
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
      max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
      idleTimeout: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000
    },
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 60000,
    queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 30000
  },
  
  // Development helpers
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test'
};