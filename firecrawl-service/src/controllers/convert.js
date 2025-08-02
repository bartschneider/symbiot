import { firecrawlService } from '../services/firecrawl.js';

/**
 * Convert single URL to Markdown
 * POST /api/convert
 */
export const convertUrl = async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    // Add request context to options
    const requestOptions = {
      ...options,
      requestId: req.requestId,
      userId: req.user?.id,
      userRole: req.user?.role
    };
    
    console.log(`[${req.requestId}] Converting URL: ${url} for user: ${req.user?.username || 'anonymous'}`);
    
    // Call conversion service
    const result = await firecrawlService.convertUrl(url, requestOptions);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime,
          fromCache: result.fromCache,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime
        }
      });
    }
    
  } catch (error) {
    console.error(`[${req.requestId}] Conversion error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSION_FAILED',
        message: 'Failed to convert URL',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Convert URL to plain text
 * POST /api/convert/text
 */
export const convertUrlToText = async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    const requestOptions = {
      ...options,
      requestId: req.requestId,
      userId: req.user?.id
    };
    
    console.log(`[${req.requestId}] Converting URL to text: ${url}`);
    
    const result = await firecrawlService.convertUrlToText(url, requestOptions);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime,
          fromCache: result.fromCache,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime
        }
      });
    }
    
  } catch (error) {
    console.error(`[${req.requestId}] Text conversion error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'TEXT_CONVERSION_FAILED',
        message: 'Failed to convert URL to text',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Batch convert multiple URLs
 * POST /api/convert/batch
 */
export const convertUrlsBatch = async (req, res) => {
  try {
    const { urls, options = {} } = req.body;
    
    const requestOptions = {
      ...options,
      requestId: req.requestId,
      userId: req.user?.id,
      maxConcurrent: Math.min(options.maxConcurrent || 3, req.user?.role === 'admin' ? 10 : 5)
    };
    
    console.log(`[${req.requestId}] Batch converting ${urls.length} URLs`);
    
    const result = await firecrawlService.convertUrlsBatch(urls, requestOptions);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        meta: {
          requestId: req.requestId,
          processingTime: result.processingTime
        }
      });
    }
    
  } catch (error) {
    console.error(`[${req.requestId}] Batch conversion error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_CONVERSION_FAILED',
        message: 'Failed to convert URLs in batch',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Validate URL without converting
 * POST /api/convert/validate
 */
export const validateUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log(`[${req.requestId}] Validating URL: ${url}`);
    
    const validation = firecrawlService.validateUrl(url);
    
    res.json({
      success: true,
      data: {
        url,
        valid: validation.valid,
        error: validation.error || null
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] URL validation error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Failed to validate URL',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Get conversion service configuration
 * GET /api/convert/config
 */
export const getConfig = async (req, res) => {
  try {
    const config = firecrawlService.getConfig();
    
    // Filter sensitive information based on user role
    const publicConfig = {
      ...config,
      cache: {
        ttlSeconds: config.cache.ttlSeconds
      }
    };
    
    // Admin users get more detailed config
    if (req.user?.role === 'admin') {
      res.json({
        success: true,
        data: config,
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        data: publicConfig,
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error(`[${req.requestId}] Config retrieval error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_RETRIEVAL_FAILED',
        message: 'Failed to retrieve configuration',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Get service health and statistics
 * GET /api/convert/health
 */
export const getHealth = async (req, res) => {
  try {
    const health = firecrawlService.getHealth();
    
    // Public health information
    const publicHealth = {
      status: health.status,
      uptime: health.uptime,
      stats: {
        totalRequests: health.stats.totalRequests,
        successRate: health.stats.totalRequests > 0 
          ? (health.stats.successfulRequests / health.stats.totalRequests).toFixed(2)
          : 0,
        averageProcessingTime: Math.round(health.stats.averageProcessingTime)
      }
    };
    
    // Admin users get detailed health information
    if (req.user?.role === 'admin') {
      res.json({
        success: true,
        data: health,
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        data: publicHealth,
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error(`[${req.requestId}] Health check error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to retrieve health status',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Clear service caches (admin only)
 * POST /api/convert/cache/clear
 */
export const clearCaches = async (req, res) => {
  try {
    console.log(`[${req.requestId}] Clearing caches - requested by: ${req.user?.username}`);
    
    const result = firecrawlService.clearCaches();
    
    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Cache clear error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_FAILED',
        message: 'Failed to clear caches',
        requestId: req.requestId
      }
    });
  }
};

export default {
  convertUrl,
  convertUrlToText,
  convertUrlsBatch,
  validateUrl,
  getConfig,
  getHealth,
  clearCaches
};