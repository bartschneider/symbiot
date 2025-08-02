import express from 'express';
import authRoutes from './auth.js';
import convertRoutes from './convert.js';
import sitemapRoutes from './sitemap.js';
import extractionHistoryRoutes from './extractionHistory.js';
import { windchaserService } from '../services/firecrawl.js';
import { cacheService } from '../services/cache.js';

const router = express.Router();

/**
 * Temporary root redirect to API info to avoid 404s on "/" when service is probed.
 * GET /
 */
router.get('/', (req, res) => {
  res.redirect(302, '/api/info');
});

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
        auth: 'disabled',
        conversion: 'operational',
        cache: 'operational',
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
      description: 'Web scraping and HTML-to-Markdown conversion service',
      endpoints: {
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
        status: 'disabled'
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
 * Service Statistics Route (public while auth disabled)
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const serviceHealth = windchaserService.getHealth();
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        auth: { status: 'disabled' },
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
      '/convert': {
        post: {
          summary: 'Convert URL to Markdown',
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
    }
  };
  
  res.json(apiDocs);
});

/**
 * Route Mounting
 *
 * NOTE: The frontend calls /api/extraction-history/check and other history endpoints.
 * Ensure the base path here matches exactly so requests don't 404.
 */
// Temporarily leave /auth mounted but note: endpoints may be no-ops or left unused
router.use('/auth', authRoutes);
router.use('/convert', convertRoutes);
router.use('/sitemap', sitemapRoutes);

// Ensure the extraction history router is mounted correctly
router.use('/extraction-history', extractionHistoryRoutes);

// Lightweight echo/diagnostic for check endpoint path to confirm mount is effective.
// This will respond if a probe accidentally hits "/check" directly under /api.
router.get('/check', (req, res) => {
  res.status(400).json({
    success: false,
    error: {
      code: 'MISSING_PARAM',
      message: 'Use /api/extraction-history/check?url=...'
    }
  });
});

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
        'GET /api/extraction-history/check?url=...',
        'GET /api/extraction-history/sessions',
        'POST /api/convert',
        'POST /api/sitemap/discover'
      ]
    }
  });
});

export default router;