import { fetcherService } from './fetcher.js';
import { extractorService } from './extractor.js';
import { converterService } from './converter.js';
import { cacheService } from './cache.js';
import { sitemapService } from './sitemap.js';
import { config } from '../config/config.js';

class FirecrawlService {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0,
      startTime: new Date()
    };
  }

  /**
   * Main service method: Convert URL to Markdown
   * @param {string} url - Target URL
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Conversion result
   */
  async convertUrl(url, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.stats.totalRequests++;
      
      // Check cache first
      if (!options.skipCache) {
        const cached = cacheService.getCachedContent(url, options);
        if (cached) {
          this.stats.cacheHits++;
          
          return {
            ...cached,
            requestId,
            fromCache: true,
            processingTime: Date.now() - startTime
          };
        }
        this.stats.cacheMisses++;
      }
      
      // Step 1: Fetch HTML content
      console.log(`[${requestId}] Fetching URL: ${url}`);
      const fetchResult = await fetcherService.fetchHtml(url, {
        timeout: options.timeout || config.playwright.timeout,
        waitUntil: options.waitUntil || 'domcontentloaded',
        waitForSelector: options.waitForSelector,
        ignoreHTTPSErrors: options.ignoreHTTPSErrors || false
      });
      
      // Step 2: Extract main content
      console.log(`[${requestId}] Extracting content...`);
      const extractResult = extractorService.extractContent(fetchResult.html, {
        removeSelectors: options.removeSelectors,
        contentSelectors: options.contentSelectors
      });
      
      // Step 3: Convert to Markdown
      console.log(`[${requestId}] Converting to Markdown...`);
      const conversionResult = converterService.convertToMarkdown(extractResult.html, {
        headingStyle: options.headingStyle || 'atx',
        bulletListMarker: options.bulletListMarker || '-',
        linkStyle: options.linkStyle || 'inlined'
      });
      
      // Step 4: Combine results
      const result = this.combineResults(
        fetchResult,
        extractResult,
        conversionResult,
        requestId,
        startTime
      );
      
      // Step 5: Cache result if successful
      if (!options.skipCache && result.success) {
        cacheService.cacheContent(url, result, {
          ttl: options.cacheTtl || config.cache.ttlSeconds
        });
      }
      
      // Update statistics
      this.updateStats(true, Date.now() - startTime);
      
      console.log(`[${requestId}] Conversion completed in ${Date.now() - startTime}ms`);
      
      return result;
      
    } catch (error) {
      this.updateStats(false, Date.now() - startTime);
      
      console.error(`[${requestId}] Conversion failed:`, error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type || 'UNKNOWN',
          url,
          requestId,
          timestamp: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Combine all processing results into final response
   * @param {Object} fetchResult - Fetch service result
   * @param {Object} extractResult - Extract service result
   * @param {Object} conversionResult - Conversion service result
   * @param {string} requestId - Request identifier
   * @param {number} startTime - Processing start time
   * @returns {Object} - Combined result
   */
  combineResults(fetchResult, extractResult, conversionResult, requestId, startTime) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      data: {
        markdown: conversionResult.markdown,
        title: fetchResult.title || '',
        description: fetchResult.description || '',
        url: fetchResult.url,
        canonicalUrl: fetchResult.canonical || fetchResult.url,
        language: fetchResult.lang || 'en',
        
        // Content structure
        content: {
          headings: extractResult.headings || [],
          links: extractResult.links || [],
          images: extractResult.images || [],
          lists: extractResult.lists || []
        },
        
        // Metrics and quality
        metrics: {
          original: {
            characterCount: fetchResult.html?.length || 0,
            ...extractResult.metrics
          },
          markdown: conversionResult.metrics,
          quality: converterService.validateQuality(
            conversionResult.markdown,
            extractResult.html
          )
        },
        
        // Processing metadata
        processing: {
          requestId,
          processingTime,
          steps: {
            fetch: fetchResult.metadata?.processing?.responseTime || 0,
            extraction: extractResult.extractionTimestamp,
            conversion: conversionResult.processingTime
          },
          userAgent: fetchResult.metadata?.processing?.userAgent,
          httpStatus: fetchResult.metadata?.processing?.httpStatus,
          finalUrl: fetchResult.metadata?.processing?.finalUrl
        }
      },
      timestamp: new Date().toISOString(),
      fromCache: false
    };
  }

  /**
   * Convert URL to plain text (simpler alternative)
   * @param {string} url - Target URL
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Text conversion result
   */
  async convertUrlToText(url, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Check cache
      const cacheKey = `text:${url}`;
      if (!options.skipCache) {
        const cached = cacheService.getCachedMetadata(cacheKey);
        if (cached) {
          return {
            ...cached,
            requestId,
            fromCache: true,
            processingTime: Date.now() - startTime
          };
        }
      }
      
      // Fetch and extract
      const fetchResult = await fetcherService.fetchHtml(url, options);
      const extractResult = extractorService.extractContent(fetchResult.html);
      
      // Convert to plain text
      const text = converterService.convertToText(extractResult.html);
      
      const result = {
        success: true,
        data: {
          text,
          title: fetchResult.title || '',
          description: fetchResult.description || '',
          url: fetchResult.url,
          wordCount: text.split(/\s+/).length,
          characterCount: text.length
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        requestId,
        fromCache: false
      };
      
      // Cache result
      if (!options.skipCache) {
        cacheService.cacheMetadata(cacheKey, result, config.cache.ttlSeconds);
      }
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type || 'UNKNOWN',
          url,
          requestId,
          timestamp: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch convert multiple URLs
   * @param {Array<string>} urls - Array of URLs to convert
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Batch conversion result
   */
  async convertUrlsBatch(urls, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const maxConcurrent = options.maxConcurrent || 3;
    
    try {
      console.log(`[${requestId}] Starting batch conversion of ${urls.length} URLs`);
      
      // Process URLs in batches to avoid overwhelming the system
      const results = [];
      const errors = [];
      
      for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (url, index) => {
          try {
            const result = await this.convertUrl(url, {
              ...options,
              timeout: options.timeout || config.playwright.timeout / 2 // Shorter timeout for batch
            });
            
            return {
              url,
              index: i + index,
              ...result
            };
          } catch (error) {
            errors.push({
              url,
              index: i + index,
              error: error.message
            });
            return null;
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          }
        });
        
        // Small delay between batches to be respectful
        if (i + maxConcurrent < urls.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return {
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
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        requestId
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          requestId,
          timestamp: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get service health and statistics
   * @returns {Object} - Service health information
   */
  getHealth() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const fetcherHealth = fetcherService.getHealthStatus();
    const cacheHealth = cacheService.getHealth();
    const sitemapHealth = sitemapService.getHealth();
    
    return {
      status: 'healthy',
      uptime: Math.floor(uptime / 1000),
      stats: this.stats,
      services: {
        fetcher: fetcherHealth,
        cache: cacheHealth,
        sitemap: sitemapHealth
      },
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique request ID
   * @returns {string} - Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update service statistics
   * @param {boolean} success - Whether request was successful
   * @param {number} processingTime - Processing time in milliseconds
   */
  updateStats(success, processingTime) {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Update average processing time
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalRequests - 1) + processingTime) / totalRequests;
  }

  /**
   * Clear all caches
   * @returns {Object} - Cache clear results
   */
  clearCaches() {
    return cacheService.clearAll();
  }

  /**
   * Validate URL before processing
   * @param {string} url - URL to validate
   * @returns {Object} - Validation result
   */
  validateUrl(url) {
    try {
      fetcherService.validateUrl(url);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get service configuration
   * @returns {Object} - Service configuration
   */
  getConfig() {
    return {
      playwright: {
        headless: config.playwright.headless,
        timeout: config.playwright.timeout,
        maxConcurrent: config.playwright.maxConcurrent
      },
      cache: {
        ttlSeconds: config.cache.ttlSeconds
      },
      content: {
        maxSizeMB: config.content.maxSizeMB,
        maxTimeoutMs: config.content.maxTimeoutMs
      },
      rateLimit: {
        windowMs: config.rateLimit.windowMs,
        maxRequests: config.rateLimit.maxRequests
      }
    };
  }
}

// Export singleton instance
export const windchaserService = new FirecrawlService();
export default FirecrawlService;