import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import routes from './routes/index.js';
import {
  corsOptions,
  helmetConfig,
  defaultRateLimit,
  requestId,
  securityHeaders,
  requestSizeLimit,
  honeypot,
  requestLogger,
  errorHandler
} from './middleware/security.js';
import {
  validateContentType,
  sanitizeQuery
} from './middleware/validation.js';
import { fetcherService } from './services/fetcher.js';
import { initDatabase, closeDatabase } from './services/database.js';

// Create Express application
const app = express();

/**
 * Trust proxy (for rate limiting and IP detection)
 */
app.set('trust proxy', 1);

/**
 * Security Middleware (applied first)
 */
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestId);

/**
 * Request Processing Middleware
 */
app.use(express.json({ 
  limit: '1mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: false, 
  limit: '1mb' 
}));

app.use(validateContentType());
app.use(requestSizeLimit(1024 * 1024)); // 1MB limit
app.use(sanitizeQuery);

/**
 * Security and Rate Limiting
 */
app.use(honeypot);
app.use(defaultRateLimit);

/**
 * Logging Middleware
 */
if (config.isDevelopment()) {
  app.use(requestLogger);
}

/**
 * Health Check Route (before other routes)
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

/**
 * Root Route
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Firecrawl Service',
      version: '1.0.0',
      description: 'Web scraping and HTML-to-Markdown conversion service',
      endpoints: {
        health: '/health',
        api: '/api',
        docs: '/api/docs'
      },
      documentation: 'Visit /api/docs for API documentation'
    }
  });
});

/**
 * API Routes
 */
app.use('/api', routes);

/**
 * Global 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      suggestion: 'Visit /api/docs for available endpoints'
    }
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Graceful Shutdown Handlers
 */
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Playwright browser instances
    await fetcherService.cleanup();
    console.log('Browser instances closed');
    
    // Close database connection
    await closeDatabase();
    console.log('Database connection closed');
    
    // Close server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Start Server
 */
const PORT = config.port;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  console.log(`🚀 Firecrawl Service started on http://${HOST}:${PORT}`);
  console.log(`📚 API Documentation: http://${HOST}:${PORT}/api/docs`);
  console.log(`💓 Health Check: http://${HOST}:${PORT}/health`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  
  // Initialize services
  try {
    await fetcherService.initialize();
    console.log('✅ Playwright browser initialized');
  } catch (error) {
    console.error('❌ Failed to initialize browser:', error.message);
  }

  // Initialize database connection
  const databaseRequired = process.env.DATABASE_REQUIRED === 'true';
  try {
    await initDatabase();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    
    if (databaseRequired) {
      console.error('🚨 Database is required but unavailable. Application cannot start.');
      console.error('   Check database connection and ensure PostgreSQL is running.');
      console.error('   Connection details: postgresql://[user]:[password]@[host]:[port]/[database]');
      process.exit(1);
    } else {
      console.log('⚠️  Application will continue without database features');
      console.log('   Set DATABASE_REQUIRED=true to make database mandatory');
    }
  }
  
  // Log configuration (non-sensitive)
  console.log('⚙️  Configuration:');
  console.log(`   - Rate Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
  console.log(`   - Cache TTL: ${config.cache.ttlSeconds}s`);
  console.log(`   - Max Content Size: ${config.content.maxSizeMB}MB`);
  console.log(`   - Playwright Timeout: ${config.playwright.timeout}ms`);
  console.log(`   - Max Concurrent: ${config.playwright.maxConcurrent}`);
  
  if (config.isDevelopment()) {
    console.log('🔑 Default demo user: username="demo", password="demo123"');
  }
});

// Export app for testing
export default app;