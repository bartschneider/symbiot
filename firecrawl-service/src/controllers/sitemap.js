import { sitemapService } from '../services/sitemap.js';

/**
 * Sitemap Discovery Controller
 * Handles HTTP requests for sitemap discovery operations
 */

/**
 * Discover all links on a given URL
 * POST /api/sitemap/discover
 */
export async function discoverLinks(req, res) {
  try {
    const { url, options = {} } = req.body;
    
    console.log(`Sitemap discovery request for: ${url}`);
    
    // Validate URL
    const validation = sitemapService.validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
          type: 'INVALID_URL'
        }
      });
    }
    
    // Process sitemap discovery
    const result = await sitemapService.discoverLinks(url, {
      ...options,
      // Override user-provided sensitive options
      skipCache: options.skipCache || false,
      timeout: Math.min(options.timeout || 30000, 60000), // Max 60s
      removeDuplicates: options.removeDuplicates !== false, // Default true
      includeImages: options.includeImages || false
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('Sitemap discovery error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during sitemap discovery',
        type: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Batch discover links from multiple URLs
 * POST /api/sitemap/batch
 */
export async function discoverLinksBatch(req, res) {
  try {
    const { urls, options = {} } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URLs array is required and must not be empty',
          type: 'INVALID_INPUT'
        }
      });
    }
    
    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Maximum 10 URLs allowed per batch request',
          type: 'BATCH_LIMIT_EXCEEDED'
        }
      });
    }
    
    console.log(`Batch sitemap discovery request for ${urls.length} URLs`);
    
    const results = [];
    const errors = [];
    
    // Process URLs sequentially to avoid overwhelming the system
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        const validation = sitemapService.validateUrl(url);
        if (!validation.valid) {
          errors.push({
            url,
            index: i,
            error: validation.error,
            type: 'INVALID_URL'
          });
          continue;
        }
        
        const result = await sitemapService.discoverLinks(url, {
          ...options,
          skipCache: options.skipCache || false,
          timeout: Math.min(options.timeout || 20000, 30000), // Shorter timeout for batch
          removeDuplicates: options.removeDuplicates !== false,
          includeImages: options.includeImages || false
        });
        
        if (result.success) {
          results.push({
            url,
            index: i,
            ...result
          });
        } else {
          errors.push({
            url,
            index: i,
            error: result.error.message,
            type: result.error.type
          });
        }
        
      } catch (error) {
        errors.push({
          url,
          index: i,
          error: error.message,
          type: 'PROCESSING_ERROR'
        });
      }
      
      // Small delay between requests to be respectful
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalUrls: urls.length,
          successful: results.length,
          failed: errors.length,
          successRate: results.length / urls.length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch sitemap discovery error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during batch sitemap discovery',
        type: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Validate URL for sitemap discovery
 * POST /api/sitemap/validate
 */
export async function validateUrl(req, res) {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URL is required',
          type: 'MISSING_URL'
        }
      });
    }
    
    const validation = sitemapService.validateUrl(url);
    
    res.json({
      success: true,
      data: {
        url,
        valid: validation.valid,
        error: validation.error || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('URL validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during URL validation',
        type: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Get sitemap service health and statistics
 * GET /api/sitemap/health
 */
export async function getHealth(req, res) {
  try {
    const health = sitemapService.getHealth();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during health check',
        type: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Get sitemap service configuration
 * GET /api/sitemap/config
 */
export async function getConfig(req, res) {
  try {
    res.json({
      success: true,
      data: {
        maxBatchSize: 10,
        maxTimeout: 60000,
        defaultTimeout: 30000,
        supportedProtocols: ['http', 'https'],
        linkTypes: ['internal', 'external', 'email', 'phone', 'file', 'anchor'],
        features: {
          removeDuplicates: true,
          includeImages: true,
          categorization: true,
          statistics: true,
          caching: true
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while retrieving configuration',
        type: 'INTERNAL_ERROR'
      }
    });
  }
}

// Export all controller functions as default
export default {
  discoverLinks,
  discoverLinksBatch,
  validateUrl,
  getHealth,
  getConfig
};