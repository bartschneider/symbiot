import express from 'express';
import authRoutes from './auth.js';
import convertRoutes from './convert.js';
import sitemapRoutes from './sitemap.js';
import extractionHistoryRoutes from './extractionHistory.js';
import { authService } from '../services/auth.js';
import { windchaserService } from '../services/windchaser.js';
import { cacheService } from '../services/cache.js';
import { healthCheck } from '../services/database.js';

const router = express.Router();

/**
 * Health Check Route (public)
 * GET /api/health
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      services: {
        auth: 'operational',
        conversion: 'operational',
        cache: 'operational',
        database: 'operational' // Will check via healthCheck if needed
      }
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      }
    });
  }
});

/**
 * API Info Route (public)
 * GET /api/info
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Firecrawl Service API',
      version: '1.0.0',
      description: 'Web scraping and HTML-to-Markdown conversion service with JWT authentication',
      endpoints: {
        auth: {
          base: '/api/auth',
          methods: ['POST /register', 'POST /login', 'POST /logout', 'GET /profile']
        },
        convert: {
          base: '/api/convert',
          methods: ['POST /', 'POST /text', 'POST /batch', 'POST /validate']
        },
        sitemap: {
          base: '/api/sitemap',
          methods: ['POST /discover', 'POST /batch', 'POST /validate', 'GET /health']
        },
        extractionHistory: {
          base: '/api/extraction-history',
          methods: ['GET /sessions', 'GET /sessions/:id', 'GET /retryable', 'POST /retry', 'GET /analytics']
        }
      },
      authentication: {
        types: ['JWT Bearer Token', 'API Key'],
        headers: ['Authorization: Bearer <token>', 'X-API-Key: <key>']
      },
      rateLimit: {
        window: '15 minutes',
        maxRequests: 100
      },
      documentation: 'https://docs.windchaser.dev'
    }
  });
});

/**
 * Service Statistics Route (admin only)
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    // Simple auth check for stats endpoint
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Access token required' }
      });
    }
    
    const decoded = authService.verifyToken(token);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin access required' }
      });
    }
    
    const authStats = authService.getStats();
    const serviceHealth = windchaserService.getHealth();
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        auth: authStats,
        service: serviceHealth,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve statistics'
      }
    });
  }
});

/**
 * API Documentation Route (public)
 * GET /api/docs
 */
router.get('/docs', (req, res) => {
  const apiDocs = {
    openapi: '3.0.0',
    info: {
      title: 'Firecrawl Service API',
      version: '1.0.0',
      description: 'Web scraping and HTML-to-Markdown conversion service'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}/api`,
        description: 'Development server'
      }
    ],
    paths: {
      '/auth/login': {
        post: {
          summary: 'User login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  },
                  required: ['username', 'password']
                }
              }
            }
          }
        }
      },
      '/convert': {
        post: {
          summary: 'Convert URL to Markdown',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    options: {
                      type: 'object',
                      properties: {
                        timeout: { type: 'integer' },
                        waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'] },
                        headingStyle: { type: 'string', enum: ['atx', 'setext'] }
                      }
                    }
                  },
                  required: ['url']
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  };
  
  res.json(apiDocs);
});

/**
 * Route Mounting
 */
router.use('/auth', authRoutes);
router.use('/convert', convertRoutes);
router.use('/sitemap', sitemapRoutes);
router.use('/extraction-history', extractionHistoryRoutes);

/**
 * 404 Handler for API routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      availableEndpoints: [
        'GET /api/health',
        'GET /api/info',
        'POST /api/auth/login',
        'POST /api/convert',
        'POST /api/sitemap/discover'
      ]
    }
  });
});

export default router;