import { fetcherService } from './fetcher.js';
import { cacheService } from './cache.js';
import { extractionHistoryService } from './extractionHistory.js';
import { config } from '../config/config.js';
import * as cheerio from 'cheerio';

/**
 * Sitemap Discovery Service
 * Extracts all hyperlinks from a given URL with their titles and URLs
 */
class SitemapService {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLinksDiscovered: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Discover all links on a given URL with database tracking
   * @param {string} url - Target URL to scan for links
   * @param {Object} options - Discovery options
   * @param {string} userId - User ID for database tracking
   * @param {string} extractionId - Optional extraction ID for tracking
   * @returns {Promise<Object>} - Discovery result with links
   */
  async discoverLinks(url, options = {}, userId = null, extractionId = null) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.stats.totalRequests++;
      
      console.log(`[${requestId}] Starting sitemap discovery for: ${url}`);
      
      // Check cache first
      const cacheKey = `sitemap:${url}`;
      if (!options.skipCache) {
        const cached = cacheService.getCachedMetadata(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          console.log(`[${requestId}] Returning cached sitemap data`);
          
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
      console.log(`[${requestId}] Fetching HTML content...`);
      const fetchResult = await fetcherService.fetchHtml(url, {
        timeout: options.timeout || config.playwright.timeout,
        waitUntil: options.waitUntil || 'domcontentloaded',
        waitForSelector: options.waitForSelector,
        ignoreHTTPSErrors: options.ignoreHTTPSErrors || false
      });
      
      // Step 2: Extract all links from HTML
      console.log(`[${requestId}] Extracting links from HTML...`);
      const links = this.extractLinks(fetchResult.html, fetchResult.url, options);
      
      // Step 3: Process and categorize links
      console.log(`[${requestId}] Processing and categorizing ${links.length} links...`);
      const processedLinks = this.processLinks(links, fetchResult.url, options);
      
      // Step 4: Build result
      const result = {
        success: true,
        data: {
          url: fetchResult.url,
          title: fetchResult.title || '',
          description: fetchResult.description || '',
          canonicalUrl: fetchResult.canonical || fetchResult.url,
          
          // Link data
          links: processedLinks.links,
          
          // Statistics
          summary: {
            totalLinks: processedLinks.links.length,
            internalLinks: processedLinks.stats.internal,
            externalLinks: processedLinks.stats.external,
            emailLinks: processedLinks.stats.email,
            phoneLinks: processedLinks.stats.phone,
            fileLinks: processedLinks.stats.files,
            anchorLinks: processedLinks.stats.anchors,
            uniqueDomains: processedLinks.stats.uniqueDomains,
            linksByType: processedLinks.stats.byType
          },
          
          // Categories
          categories: {
            internal: processedLinks.categories.internal,
            external: processedLinks.categories.external,
            email: processedLinks.categories.email,
            phone: processedLinks.categories.phone,
            files: processedLinks.categories.files,
            anchors: processedLinks.categories.anchors
          }
        },
        
        // Processing metadata
        processing: {
          requestId,
          processingTime: Date.now() - startTime,
          steps: {
            fetch: fetchResult.metadata?.processing?.responseTime || 0,
            extraction: Date.now() - startTime
          },
          userAgent: fetchResult.metadata?.processing?.userAgent,
          httpStatus: fetchResult.metadata?.processing?.httpStatus,
          finalUrl: fetchResult.metadata?.processing?.finalUrl
        },
        
        timestamp: new Date().toISOString(),
        fromCache: false
      };
      
      // Step 5: Cache result if successful
      if (!options.skipCache) {
        cacheService.cacheMetadata(cacheKey, result, {
          ttl: options.cacheTtl || config.cache.ttlSeconds
        });
      }
      
      // Update database tracking if extractionId provided
      if (extractionId && userId) {
        try {
          await extractionHistoryService.updateUrlExtraction(extractionId, {
            status: 'success',
            linksFound: processedLinks.links.length,
            processingTime: Date.now() - startTime,
            httpStatus: fetchResult.metadata?.processing?.httpStatus,
            finalUrl: fetchResult.metadata?.processing?.finalUrl,
            metadata: {
              requestId,
              userAgent: fetchResult.metadata?.processing?.userAgent,
              categories: processedLinks.categories,
              summary: result.data.summary
            }
          });
          console.log(`[${requestId}] Database tracking updated for extraction ${extractionId}`);
        } catch (dbError) {
          console.error(`[${requestId}] Database tracking failed:`, dbError.message);
          // Don't fail the main operation due to tracking errors
        }
      }

      // Update statistics
      this.updateStats(true, Date.now() - startTime, processedLinks.links.length);
      
      console.log(`[${requestId}] Sitemap discovery completed: ${processedLinks.links.length} links found in ${Date.now() - startTime}ms`);
      
      return result;
      
    } catch (error) {
      // Update database tracking for failed extraction
      if (extractionId && userId) {
        try {
          await extractionHistoryService.updateUrlExtraction(extractionId, {
            status: 'failed',
            errorType: error.type || 'SITEMAP_DISCOVERY_ERROR',
            errorMessage: error.message,
            metadata: {
              requestId,
              processingTime: Date.now() - startTime
            }
          });
          console.log(`[${requestId}] Database tracking updated for failed extraction ${extractionId}`);
        } catch (dbError) {
          console.error(`[${requestId}] Database tracking failed:`, dbError.message);
        }
      }

      this.updateStats(false, Date.now() - startTime, 0);
      
      console.error(`[${requestId}] Sitemap discovery failed:`, error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type || 'SITEMAP_DISCOVERY_ERROR',
          url,
          requestId,
          timestamp: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract all links from HTML content
   * @param {string} html - HTML content
   * @param {string} baseUrl - Base URL for resolving relative links
   * @param {Object} options - Extraction options
   * @returns {Array} - Array of extracted links
   */
  extractLinks(html, baseUrl, options = {}) {
    const $ = cheerio.load(html);
    const links = [];
    const seenUrls = new Set();
    
    // Extract all anchor tags with href attributes
    $('a[href]').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const title = this.extractLinkTitle($link);
      const text = $link.text().trim();
      const rel = $link.attr('rel');
      const target = $link.attr('target');
      
      if (href && !seenUrls.has(href)) {
        seenUrls.add(href);
        
        // Resolve relative URLs
        const resolvedUrl = this.resolveUrl(href, baseUrl);
        
        links.push({
          originalHref: href,
          url: resolvedUrl,
          title: title || text || href,
          text: text,
          rel: rel || null,
          target: target || null,
          position: index + 1
        });
      }
    });
    
    // Extract area tags from image maps
    $('area[href]').each((index, element) => {
      const $area = $(element);
      const href = $area.attr('href');
      const alt = $area.attr('alt');
      const title = $area.attr('title');
      
      if (href && !seenUrls.has(href)) {
        seenUrls.add(href);
        
        const resolvedUrl = this.resolveUrl(href, baseUrl);
        
        links.push({
          originalHref: href,
          url: resolvedUrl,
          title: title || alt || href,
          text: alt || '',
          type: 'area',
          position: links.length + 1
        });
      }
    });
    
    // Extract links from specific elements if requested
    if (options.includeImages) {
      $('img[src]').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src');
        const alt = $img.attr('alt');
        const title = $img.attr('title');
        
        if (src && !seenUrls.has(src)) {
          seenUrls.add(src);
          
          const resolvedUrl = this.resolveUrl(src, baseUrl);
          
          links.push({
            originalHref: src,
            url: resolvedUrl,
            title: title || alt || src,
            text: alt || '',
            type: 'image',
            position: links.length + 1
          });
        }
      });
    }
    
    return links;
  }

  /**
   * Extract title from link element
   * @param {Object} $link - Cheerio link element
   * @returns {string} - Link title
   */
  extractLinkTitle($link) {
    // Priority order for title extraction
    return $link.attr('title') || 
           $link.attr('aria-label') || 
           $link.find('img').attr('alt') || 
           $link.text().trim() || 
           null;
  }

  /**
   * Resolve relative URLs to absolute URLs
   * @param {string} href - Original href attribute
   * @param {string} baseUrl - Base URL for resolution
   * @returns {string} - Resolved absolute URL
   */
  resolveUrl(href, baseUrl) {
    try {
      // Already absolute URL
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      
      // Protocol-relative URL
      if (href.startsWith('//')) {
        const baseProtocol = new URL(baseUrl).protocol;
        return `${baseProtocol}${href}`;
      }
      
      // Anchor links, mailto, tel, etc.
      if (href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || href.startsWith('javascript:')) {
        return href;
      }
      
      // Relative URL
      return new URL(href, baseUrl).href;
      
    } catch (error) {
      console.warn(`Failed to resolve URL: ${href} relative to ${baseUrl}`);
      return href;
    }
  }

  /**
   * Process and categorize extracted links
   * @param {Array} links - Raw extracted links
   * @param {string} baseUrl - Base URL for categorization
   * @param {Object} options - Processing options
   * @returns {Object} - Processed links with categories and stats
   */
  processLinks(links, baseUrl, options = {}) {
    const baseDomain = this.extractDomain(baseUrl);
    const categories = {
      internal: [],
      external: [],
      email: [],
      phone: [],
      files: [],
      anchors: []
    };
    
    const stats = {
      internal: 0,
      external: 0,
      email: 0,
      phone: 0,
      files: 0,
      anchors: 0,
      uniqueDomains: new Set(),
      byType: {}
    };
    
    const processedLinks = links.map(link => {
      const linkType = this.categorizeLink(link.url, baseDomain);
      const domain = this.extractDomain(link.url);
      
      // Enhanced link object
      const processedLink = {
        ...link,
        type: linkType,
        domain: domain,
        isInternal: linkType === 'internal',
        isExternal: linkType === 'external'
      };
      
      // Add to appropriate category
      categories[linkType].push(processedLink);
      
      // Update statistics
      stats[linkType]++;
      if (domain) {
        stats.uniqueDomains.add(domain);
      }
      
      // Track by file type for file links
      if (linkType === 'files') {
        const extension = this.getFileExtension(link.url);
        if (extension) {
          stats.byType[extension] = (stats.byType[extension] || 0) + 1;
        }
      }
      
      return processedLink;
    });
    
    // Convert Set to count for uniqueDomains
    stats.uniqueDomains = stats.uniqueDomains.size;
    
    // Filter duplicates if requested
    if (options.removeDuplicates) {
      const seen = new Map();
      const uniqueLinks = [];
      
      for (const link of processedLinks) {
        const key = link.url;
        if (!seen.has(key) || seen.get(key).title.length < link.title.length) {
          seen.set(key, link);
        }
      }
      
      return {
        links: Array.from(seen.values()),
        categories: this.recategorizeLinks(Array.from(seen.values())),
        stats: this.recalculateStats(Array.from(seen.values()), baseDomain)
      };
    }
    
    return {
      links: processedLinks,
      categories,
      stats
    };
  }

  /**
   * Categorize a link based on its URL
   * @param {string} url - Link URL
   * @param {string} baseDomain - Base domain for comparison
   * @returns {string} - Link category
   */
  categorizeLink(url, baseDomain) {
    // Anchor links
    if (url.startsWith('#')) {
      return 'anchors';
    }
    
    // Email links
    if (url.startsWith('mailto:')) {
      return 'email';
    }
    
    // Phone links
    if (url.startsWith('tel:')) {
      return 'phone';
    }
    
    // File links (common file extensions)
    const fileExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'rar', '7z', 'tar', 'gz',
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      'mp3', 'mp4', 'avi', 'mov', 'wmv',
      'txt', 'csv', 'json', 'xml'
    ];
    
    const extension = this.getFileExtension(url);
    if (extension && fileExtensions.includes(extension.toLowerCase())) {
      return 'files';
    }
    
    // Internal vs External
    const linkDomain = this.extractDomain(url);
    if (!linkDomain) {
      return 'anchors'; // Likely a fragment or special URL
    }
    
    return linkDomain === baseDomain ? 'internal' : 'external';
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string|null} - Domain or null if invalid
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get file extension from URL
   * @param {string} url - URL to extract extension from
   * @returns {string|null} - File extension or null
   */
  getFileExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const extension = pathname.split('.').pop();
      return extension && extension.length <= 5 ? extension : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Recategorize links after deduplication
   * @param {Array} links - Deduplicated links
   * @returns {Object} - Recategorized links
   */
  recategorizeLinks(links) {
    const categories = {
      internal: [],
      external: [],
      email: [],
      phone: [],
      files: [],
      anchors: []
    };
    
    links.forEach(link => {
      categories[link.type].push(link);
    });
    
    return categories;
  }

  /**
   * Recalculate statistics after deduplication
   * @param {Array} links - Deduplicated links
   * @param {string} baseDomain - Base domain
   * @returns {Object} - Recalculated statistics
   */
  recalculateStats(links, baseDomain) {
    const stats = {
      internal: 0,
      external: 0,
      email: 0,
      phone: 0,
      files: 0,
      anchors: 0,
      uniqueDomains: new Set(),
      byType: {}
    };
    
    links.forEach(link => {
      stats[link.type]++;
      const domain = this.extractDomain(link.url);
      if (domain) {
        stats.uniqueDomains.add(domain);
      }
      
      if (link.type === 'files') {
        const extension = this.getFileExtension(link.url);
        if (extension) {
          stats.byType[extension] = (stats.byType[extension] || 0) + 1;
        }
      }
    });
    
    stats.uniqueDomains = stats.uniqueDomains.size;
    return stats;
  }

  /**
   * Get service health and statistics
   * @returns {Object} - Service health information
   */
  getHealth() {
    return {
      status: 'healthy',
      stats: this.stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique request ID
   * @returns {string} - Request ID
   */
  generateRequestId() {
    return `sitemap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update service statistics
   * @param {boolean} success - Whether request was successful
   * @param {number} processingTime - Processing time in milliseconds
   * @param {number} linksFound - Number of links found
   */
  updateStats(success, processingTime, linksFound) {
    if (success) {
      this.stats.successfulRequests++;
      this.stats.totalLinksDiscovered += linksFound;
    } else {
      this.stats.failedRequests++;
    }
    
    // Update average processing time
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalRequests - 1) + processingTime) / totalRequests;
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
   * Process URLs in chunks with database session tracking
   * @param {string} userId - User ID
   * @param {string} sourceUrl - Original source URL
   * @param {Array} urls - URLs to process
   * @param {Object} options - Processing options
   * @returns {Object} - Session and processing results
   */
  async processUrlsWithTracking(userId, sourceUrl, urls, options = {}) {
    const {
      sessionName,
      chunkSize = 25,
      maxRetries = 3,
      processingOptions = {}
    } = options;

    try {
      // Create extraction session
      const session = await extractionHistoryService.createSession({
        userId,
        sourceUrl,
        sessionName,
        totalUrls: urls.length,
        metadata: {
          chunkSize,
          maxRetries,
          processingOptions,
          startedAt: new Date().toISOString()
        }
      });

      console.log(`Created extraction session ${session.session_id} for ${urls.length} URLs`);

      // Process URLs in chunks
      const chunks = [];
      for (let i = 0; i < urls.length; i += chunkSize) {
        chunks.push(urls.slice(i, i + chunkSize));
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      const results = [];

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const chunkNumber = chunkIndex + 1;

        console.log(`Processing chunk ${chunkNumber}/${chunks.length} with ${chunk.length} URLs`);

        // Create URL extraction records for this chunk
        const extractions = await extractionHistoryService.createUrlExtractions(
          session.session_id,
          chunk,
          chunkNumber,
          { maxRetries }
        );

        // Process each URL in the chunk
        for (let urlIndex = 0; urlIndex < chunk.length; urlIndex++) {
          const url = chunk[urlIndex];
          const extraction = extractions[urlIndex];

          try {
            // Update status to processing
            await extractionHistoryService.updateUrlExtraction(extraction.extraction_id, {
              status: 'processing'
            });

            // Process the URL with tracking
            const result = await this.discoverLinks(
              url,
              processingOptions,
              userId,
              extraction.extraction_id
            );

            if (result.success) {
              totalSuccessful++;
            } else {
              totalFailed++;
            }

            results.push({
              url,
              extractionId: extraction.extraction_id,
              chunkNumber,
              positionInChunk: urlIndex,
              success: result.success,
              linksFound: result.success ? result.data.summary.totalLinks : 0,
              error: result.success ? null : result.error
            });

          } catch (error) {
            console.error(`Error processing URL ${url}:`, error.message);
            
            // Update extraction record with error
            await extractionHistoryService.updateUrlExtraction(extraction.extraction_id, {
              status: 'failed',
              errorType: 'PROCESSING_ERROR',
              errorMessage: error.message
            });

            totalFailed++;
            results.push({
              url,
              extractionId: extraction.extraction_id,
              chunkNumber,
              positionInChunk: urlIndex,
              success: false,
              error: {
                type: 'PROCESSING_ERROR',
                message: error.message
              }
            });
          }

          // Small delay between requests to be respectful
          if (urlIndex < chunk.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Delay between chunks
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update session with final statistics
      const sessionStatus = totalFailed === 0 ? 'completed' : (totalSuccessful === 0 ? 'failed' : 'completed');
      await extractionHistoryService.updateSession(session.session_id, {
        status: sessionStatus,
        successful_urls: totalSuccessful,
        failed_urls: totalFailed,
        metadata: {
          ...session.metadata,
          completedAt: new Date().toISOString(),
          chunks: chunks.length,
          processingResults: {
            totalProcessed: results.length,
            successful: totalSuccessful,
            failed: totalFailed,
            successRate: totalSuccessful / results.length
          }
        }
      });

      console.log(`Session ${session.session_id} completed: ${totalSuccessful} successful, ${totalFailed} failed`);

      return {
        success: true,
        session,
        results,
        summary: {
          totalUrls: urls.length,
          chunksProcessed: chunks.length,
          successful: totalSuccessful,
          failed: totalFailed,
          successRate: totalSuccessful / urls.length,
          sessionId: session.session_id
        }
      };

    } catch (error) {
      console.error('Batch processing with tracking failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const sitemapService = new SitemapService();
export default SitemapService;