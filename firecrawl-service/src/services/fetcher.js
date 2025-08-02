import { chromium } from 'playwright';
import { config } from '../config/config.js';

class FetcherService {
  constructor() {
    this.browser = null;
    this.activePages = new Set();
  }

  /**
   * Initialize browser instance for reuse
   */
  async initialize() {
    if (!this.browser) {
      // Configure Playwright to use system Chromium in Docker
      const launchOptions = {
        headless: config.playwright.headless,
        timeout: config.playwright.timeout,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      };
      
      // Use system Chromium executable if available (for Docker environments)
      if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      }
      
      this.browser = await chromium.launch(launchOptions);
    }
    return this.browser;
  }

  /**
   * Safely close browser and cleanup
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.activePages.clear();
  }

  /**
   * Fetch HTML content from URL with enhanced error handling
   * @param {string} url - Target URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Result with HTML content and metadata
   */
  async fetchHtml(url, options = {}) {
    const startTime = Date.now();
    let page = null;
    
    try {
      // Validate URL
      this.validateUrl(url);
      
      // Initialize browser if needed
      await this.initialize();
      
      // Check concurrent page limit
      if (this.activePages.size >= config.playwright.maxConcurrent) {
        throw new Error('Maximum concurrent requests exceeded');
      }
      
      // Create new page with context
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (compatible; FirecrawlBot/1.0; +https://windchaser.dev)',
        ignoreHTTPSErrors: options.ignoreHTTPSErrors || false,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        }
      });
      
      page = await context.newPage();
      this.activePages.add(page);
      
      // Set timeout
      page.setDefaultTimeout(options.timeout || config.playwright.timeout);
      
      // Navigate to URL
      const response = await page.goto(url, {
        waitUntil: options.waitUntil || 'domcontentloaded',
        timeout: options.timeout || config.playwright.timeout
      });
      
      // Check response status
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
      
      // Wait for any dynamic content
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
      } else {
        // Default wait for common dynamic content indicators
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          // Ignore timeout, content might be static
        });
      }
      
      // Extract content and metadata
      const result = await page.evaluate(() => {
        // Get page metadata
        const title = document.title || '';
        const description = document.querySelector('meta[name="description"]')?.content || '';
        const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
        const lang = document.documentElement.lang || '';
        
        // Get main content - try common content selectors
        const contentSelectors = [
          'main',
          'article',
          '[role="main"]',
          '.content',
          '.main-content',
          '#content',
          '#main',
          'body'
        ];
        
        let contentElement = null;
        for (const selector of contentSelectors) {
          contentElement = document.querySelector(selector);
          if (contentElement) break;
        }
        
        const html = contentElement ? contentElement.outerHTML : document.body.outerHTML;
        
        return {
          html,
          title,
          description,
          canonical,
          lang,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      });
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Add processing metadata
      result.metadata = {
        ...result,
        processing: {
          responseTime,
          contentLength: result.html.length,
          httpStatus: response.status(),
          finalUrl: response.url(),
          userAgent: await page.evaluate(() => navigator.userAgent)
        }
      };
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Enhanced error information
      const enhancedError = new Error(`Failed to fetch URL: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.url = url;
      enhancedError.responseTime = responseTime;
      enhancedError.type = this.categorizeError(error);
      
      throw enhancedError;
      
    } finally {
      // Cleanup page
      if (page) {
        this.activePages.delete(page);
        await page.close().catch(() => {}); // Ignore cleanup errors
      }
    }
  }

  /**
   * Validate URL format and security
   * @param {string} url - URL to validate
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
      }
      
      // Check for SSRF prevention
      const hostname = urlObj.hostname.toLowerCase();
      const forbiddenHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal'
      ];
      
      if (forbiddenHosts.includes(hostname) || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        throw new Error('Access to internal/private networks is not allowed');
      }
      
      // Check URL length
      if (url.length > 2048) {
        throw new Error('URL length exceeds maximum allowed (2048 characters)');
      }
      
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Categorize error types for better handling
   * @param {Error} error - Error to categorize
   * @returns {string} - Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('net::err_timed_out')) {
      return 'TIMEOUT';
    }
    if (message.includes('net::err_name_not_resolved')) {
      return 'DNS_ERROR';
    }
    if (message.includes('net::err_connection_refused')) {
      return 'CONNECTION_REFUSED';
    }
    if (message.includes('http 4') || message.includes('http 5')) {
      return 'HTTP_ERROR';
    }
    if (message.includes('ssl') || message.includes('certificate')) {
      return 'SSL_ERROR';
    }
    if (message.includes('maximum concurrent')) {
      return 'RATE_LIMIT';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Get service health status
   * @returns {Object} - Health status information
   */
  getHealthStatus() {
    return {
      browserInitialized: !!this.browser,
      activePages: this.activePages.size,
      maxConcurrent: config.playwright.maxConcurrent,
      memoryUsage: process.memoryUsage()
    };
  }
}

// Export singleton instance
export const fetcherService = new FetcherService();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await fetcherService.cleanup();
});

process.on('SIGINT', async () => {
  await fetcherService.cleanup();
});

export default FetcherService;