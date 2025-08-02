import NodeCache from 'node-cache';
import crypto from 'crypto';
import { config } from '../config/config.js';

class CacheService {
  constructor() {
    // Main cache for converted content
    this.contentCache = new NodeCache({
      stdTTL: config.cache.ttlSeconds,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Better performance, but be careful with object mutations
      deleteOnExpire: true,
      maxKeys: 1000 // Limit cache size
    });
    
    // Separate cache for metadata and small objects
    this.metaCache = new NodeCache({
      stdTTL: config.cache.ttlSeconds * 2, // Longer TTL for metadata
      checkperiod: 600,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 2000
    });
    
    // Cache for rate limiting
    this.rateLimitCache = new NodeCache({
      stdTTL: config.rateLimit.windowMs / 1000, // Convert to seconds
      checkperiod: 60,
      useClones: false,
      deleteOnExpire: true
    });
    
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for cache monitoring
   */
  setupEventHandlers() {
    // Content cache events
    this.contentCache.on('set', (key, value) => {
      if (config.isDevelopment()) {
        console.log(`Cache SET: ${key} (${this.getObjectSize(value)} bytes)`);
      }
    });
    
    this.contentCache.on('del', (key, value) => {
      if (config.isDevelopment()) {
        console.log(`Cache DEL: ${key}`);
      }
    });
    
    this.contentCache.on('expired', (key, value) => {
      if (config.isDevelopment()) {
        console.log(`Cache EXPIRED: ${key}`);
      }
    });
  }

  /**
   * Generate cache key for URL
   * @param {string} url - URL to cache
   * @param {Object} options - Additional options that affect caching
   * @returns {string} - Cache key
   */
  generateCacheKey(url, options = {}) {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);
    
    // Include relevant options in key
    const keyData = {
      url: normalizedUrl,
      options: this.sanitizeOptions(options)
    };
    
    // Create hash
    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `url:${hash}`;
  }

  /**
   * Normalize URL for consistent caching
   * @param {string} url - Original URL
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Remove fragment identifier
      urlObj.hash = '';
      
      // Sort query parameters for consistency
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();
      
      // Sort parameters alphabetically
      const keys = Array.from(params.keys()).sort();
      keys.forEach(key => {
        sortedParams.append(key, params.get(key));
      });
      
      urlObj.search = sortedParams.toString();
      
      return urlObj.toString().toLowerCase();
    } catch (error) {
      return url.toLowerCase();
    }
  }

  /**
   * Sanitize options for cache key generation
   * @param {Object} options - Options object
   * @returns {Object} - Sanitized options
   */
  sanitizeOptions(options) {
    // Only include options that affect the output
    const relevantOptions = {};
    
    const optionsToInclude = [
      'waitUntil',
      'timeout',
      'waitForSelector',
      'ignoreHTTPSErrors'
    ];
    
    optionsToInclude.forEach(key => {
      if (options[key] !== undefined) {
        relevantOptions[key] = options[key];
      }
    });
    
    return relevantOptions;
  }

  /**
   * Cache converted content
   * @param {string} url - Original URL
   * @param {Object} content - Converted content object
   * @param {Object} options - Cache options
   * @returns {boolean} - Success status
   */
  cacheContent(url, content, options = {}) {
    try {
      const key = this.generateCacheKey(url, options);
      
      // Add cache metadata
      const cacheEntry = {
        ...content,
        cached: {
          timestamp: new Date().toISOString(),
          ttl: options.ttl || config.cache.ttlSeconds,
          url,
          size: this.getObjectSize(content)
        }
      };
      
      // Set custom TTL if provided
      const ttl = options.ttl || config.cache.ttlSeconds;
      
      return this.contentCache.set(key, cacheEntry, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Retrieve cached content
   * @param {string} url - Original URL
   * @param {Object} options - Cache options
   * @returns {Object|null} - Cached content or null
   */
  getCachedContent(url, options = {}) {
    try {
      const key = this.generateCacheKey(url, options);
      const cached = this.contentCache.get(key);
      
      if (cached) {
        // Update access timestamp
        cached.cached.lastAccessed = new Date().toISOString();
        
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Check if content is cached
   * @param {string} url - Original URL
   * @param {Object} options - Cache options
   * @returns {boolean} - Cache hit status
   */
  isCached(url, options = {}) {
    const key = this.generateCacheKey(url, options);
    return this.contentCache.has(key);
  }

  /**
   * Invalidate cached content for URL
   * @param {string} url - URL to invalidate
   * @param {Object} options - Cache options
   * @returns {boolean} - Success status
   */
  invalidateContent(url, options = {}) {
    const key = this.generateCacheKey(url, options);
    return this.contentCache.del(key) > 0;
  }

  /**
   * Cache metadata
   * @param {string} key - Metadata key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in seconds
   * @returns {boolean} - Success status
   */
  cacheMetadata(key, value, ttl = null) {
    try {
      const cacheKey = `meta:${key}`;
      return this.metaCache.set(cacheKey, value, ttl || config.cache.ttlSeconds * 2);
    } catch (error) {
      console.error('Metadata cache set error:', error);
      return false;
    }
  }

  /**
   * Retrieve cached metadata
   * @param {string} key - Metadata key
   * @returns {*} - Cached value or undefined
   */
  getCachedMetadata(key) {
    try {
      const cacheKey = `meta:${key}`;
      return this.metaCache.get(cacheKey);
    } catch (error) {
      console.error('Metadata cache get error:', error);
      return undefined;
    }
  }

  /**
   * Rate limiting cache operations
   * @param {string} identifier - Rate limit identifier (IP, user, etc.)
   * @param {number} limit - Request limit
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} - Rate limit status
   */
  checkRateLimit(identifier, limit, windowMs = config.rateLimit.windowMs) {
    const key = `rate:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests
    let requests = this.rateLimitCache.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    const isLimited = requests.length >= limit;
    
    if (!isLimited) {
      // Add current request
      requests.push(now);
      this.rateLimitCache.set(key, requests, Math.ceil(windowMs / 1000));
    }
    
    return {
      isLimited,
      requestCount: requests.length,
      limit,
      remainingRequests: Math.max(0, limit - requests.length),
      resetTime: new Date(Math.min(...requests) + windowMs),
      retryAfter: isLimited ? Math.ceil((Math.min(...requests) + windowMs - now) / 1000) : 0
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const contentStats = this.contentCache.getStats();
    const metaStats = this.metaCache.getStats();
    const rateLimitStats = this.rateLimitCache.getStats();
    
    return {
      content: {
        keys: contentStats.keys,
        hits: contentStats.hits,
        misses: contentStats.misses,
        hitRate: contentStats.hits / (contentStats.hits + contentStats.misses) || 0,
        memoryUsage: this.getMemoryUsage(this.contentCache)
      },
      metadata: {
        keys: metaStats.keys,
        hits: metaStats.hits,
        misses: metaStats.misses,
        hitRate: metaStats.hits / (metaStats.hits + metaStats.misses) || 0,
        memoryUsage: this.getMemoryUsage(this.metaCache)
      },
      rateLimit: {
        keys: rateLimitStats.keys,
        hits: rateLimitStats.hits,
        misses: rateLimitStats.misses
      },
      system: {
        totalMemoryUsage: process.memoryUsage().heapUsed,
        uptime: process.uptime()
      }
    };
  }

  /**
   * Estimate memory usage of cache
   * @param {NodeCache} cache - Cache instance
   * @returns {number} - Estimated memory usage in bytes
   */
  getMemoryUsage(cache) {
    const keys = cache.keys();
    let totalSize = 0;
    
    keys.forEach(key => {
      const value = cache.get(key);
      if (value) {
        totalSize += this.getObjectSize(value);
      }
    });
    
    return totalSize;
  }

  /**
   * Estimate object size in bytes
   * @param {*} obj - Object to measure
   * @returns {number} - Estimated size in bytes
   */
  getObjectSize(obj) {
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16 encoding
    }
    
    if (typeof obj === 'number') {
      return 8;
    }
    
    if (typeof obj === 'boolean') {
      return 4;
    }
    
    if (typeof obj === 'object') {
      return JSON.stringify(obj).length * 2;
    }
    
    return 0;
  }

  /**
   * Clear all caches
   * @returns {Object} - Cleanup statistics
   */
  clearAll() {
    const contentKeys = this.contentCache.keys().length;
    const metaKeys = this.metaCache.keys().length;
    const rateLimitKeys = this.rateLimitCache.keys().length;
    
    this.contentCache.flushAll();
    this.metaCache.flushAll();
    this.rateLimitCache.flushAll();
    
    return {
      clearedContent: contentKeys,
      clearedMetadata: metaKeys,
      clearedRateLimit: rateLimitKeys,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear expired entries manually
   * @returns {Object} - Cleanup statistics
   */
  cleanup() {
    const beforeContent = this.contentCache.keys().length;
    const beforeMeta = this.metaCache.keys().length;
    const beforeRateLimit = this.rateLimitCache.keys().length;
    
    // Force cleanup of expired keys by accessing internal methods
    try {
      // Trigger expired key cleanup by getting stats which forces internal cleanup
      this.contentCache.getStats();
      this.metaCache.getStats();
      this.rateLimitCache.getStats();
    } catch (error) {
      console.warn('Cache cleanup warning:', error.message);
    }
    
    const afterContent = this.contentCache.keys().length;
    const afterMeta = this.metaCache.keys().length;
    const afterRateLimit = this.rateLimitCache.keys().length;
    
    return {
      contentCleaned: beforeContent - afterContent,
      metaCleaned: beforeMeta - afterMeta,
      rateLimitCleaned: beforeRateLimit - afterRateLimit,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get cache health status
   * @returns {Object} - Health status
   */
  getHealth() {
    const stats = this.getStats();
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 100 * 1024 * 1024; // 100MB threshold
    
    return {
      status: memoryUsage.heapUsed < memoryThreshold ? 'healthy' : 'warning',
      memoryUsage: memoryUsage.heapUsed,
      memoryThreshold,
      caches: {
        content: stats.content.keys,
        metadata: stats.metadata.keys,
        rateLimit: stats.rateLimit.keys
      },
      performance: {
        contentHitRate: stats.content.hitRate,
        metadataHitRate: stats.metadata.hitRate
      }
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Periodic cleanup (every 30 minutes)
setInterval(() => {
  const stats = cacheService.cleanup();
  if (config.isDevelopment() && (stats.contentCleaned > 0 || stats.metaCleaned > 0)) {
    console.log('Cache cleanup:', stats);
  }
}, 30 * 60 * 1000);

export default CacheService;