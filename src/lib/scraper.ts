import { chromium, Browser, BrowserContext, Page } from 'playwright'

export interface ScrapingOptions {
  includeImages?: boolean
  includeTables?: boolean
  removeCodeBlocks?: boolean
  waitForLoad?: number
  timeout?: number
  userAgent?: string
}

export interface ScrapingResult {
  success: boolean
  url: string
  data?: {
    markdown: string
    title?: string
    description?: string
    images?: string[]
  }
  error?: {
    code: string
    message: string
  }
  stats: {
    processingTime: number
    contentSize: number
    imageCount: number
  }
  metadata: {
    timestamp: string
    httpStatusCode?: number
    userAgent: string
  }
}

class WebScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-images',  // Faster loading
          '--disable-plugins',
          '--disable-extensions'
        ]
      })
      
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      })
    }
  }

  async scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      await this.initialize()
      
      if (!this.context) {
        throw new Error('Browser context not initialized')
      }

      const page = await this.context.newPage()
      
      // Set timeout (reduced for testing)
      page.setDefaultTimeout(options.timeout || 15000)
      
      // Navigate to URL
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 30000
      })
      
      if (!response) {
        throw new Error('Failed to load page')
      }
      
      const httpStatusCode = response.status()
      
      if (httpStatusCode >= 400) {
        throw new Error(`HTTP ${httpStatusCode}: ${response.statusText()}`)
      }
      
      // Wait for additional load time if specified
      if (options.waitForLoad && options.waitForLoad > 0) {
        await page.waitForTimeout(options.waitForLoad)
      }
      
      // Extract content
      const [title, description, textContent, images] = await Promise.all([
        // Get page title
        page.title().catch(() => ''),
        
        // Get meta description
        page.locator('meta[name="description"]').getAttribute('content').catch(() => ''),
        
        // Get main text content
        this.extractTextContent(page, options),
        
        // Get images if requested
        options.includeImages ? this.extractImages(page, url) : []
      ])
      
      await page.close()
      
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        url,
        data: {
          markdown: textContent,
          title: title || undefined,
          description: description || undefined,
          images: images.length > 0 ? images : undefined
        },
        stats: {
          processingTime,
          contentSize: textContent.length,
          imageCount: images.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          httpStatusCode,
          userAgent: options.userAgent || 'Knowledge Graph Platform Scraper'
        }
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      let errorCode = 'SCRAPING_ERROR'
      let errorMessage = 'Unknown scraping error'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        if (error.message.includes('timeout')) {
          errorCode = 'TIMEOUT'
        } else if (error.message.includes('HTTP')) {
          errorCode = 'HTTP_ERROR'
        } else if (error.message.includes('navigation')) {
          errorCode = 'NAVIGATION_ERROR'
        }
      }
      
      return {
        success: false,
        url,
        error: {
          code: errorCode,
          message: errorMessage
        },
        stats: {
          processingTime,
          contentSize: 0,
          imageCount: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: options.userAgent || 'Knowledge Graph Platform Scraper'
        }
      }
    }
  }

  private async extractTextContent(page: Page, options: ScrapingOptions): Promise<string> {
    try {
      // Remove unwanted elements
      await page.evaluate(() => {
        // Remove scripts, styles, and other non-content elements
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share')
        elementsToRemove.forEach(el => el.remove())
      })
      
      // Get main content - try common content selectors
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        'body'
      ]
      
      let content = ''
      for (const selector of contentSelectors) {
        try {
          const element = page.locator(selector).first()
          if (await element.count() > 0) {
            content = await element.textContent() || ''
            if (content.trim().length > 100) {
              break // Found substantial content
            }
          }
        } catch {
          continue
        }
      }
      
      // If no substantial content found, get body text
      if (content.trim().length < 100) {
        content = await page.locator('body').textContent() || ''
      }
      
      // Basic markdown conversion
      let markdown = this.convertToMarkdown(content, options)
      
      // Handle tables if requested
      if (options.includeTables) {
        const tables = await this.extractTables(page)
        if (tables) {
          markdown += '\n\n' + tables
        }
      }
      
      return markdown.trim()
      
    } catch (error) {
      console.warn('Text extraction error:', error)
      return 'Failed to extract content'
    }
  }

  private async extractImages(page: Page, baseUrl: string): Promise<string[]> {
    try {
      const images = await page.evaluate((baseUrl) => {
        const imgElements = document.querySelectorAll('img[src]')
        const imageUrls: string[] = []
        
        imgElements.forEach(img => {
          const src = (img as HTMLImageElement).src
          if (src && !src.startsWith('data:')) {
            try {
              const absoluteUrl = new URL(src, baseUrl).href
              imageUrls.push(absoluteUrl)
            } catch {
              // Invalid URL, skip
            }
          }
        })
        
        return [...new Set(imageUrls)] // Remove duplicates
      }, baseUrl)
      
      return images.slice(0, 20) // Limit to 20 images
      
    } catch (error) {
      console.warn('Image extraction error:', error)
      return []
    }
  }

  private async extractTables(page: Page): Promise<string> {
    try {
      const tables = await page.evaluate(() => {
        const tableElements = document.querySelectorAll('table')
        let tablesMarkdown = ''
        
        tableElements.forEach((table, index) => {
          const rows = table.querySelectorAll('tr')
          if (rows.length === 0) return
          
          tablesMarkdown += `\n\n### Table ${index + 1}\n\n`
          
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td')
            const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '')
            
            if (cellTexts.length > 0) {
              tablesMarkdown += '| ' + cellTexts.join(' | ') + ' |\n'
              
              // Add header separator for first row
              if (rowIndex === 0) {
                tablesMarkdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n'
              }
            }
          })
        })
        
        return tablesMarkdown
      })
      
      return tables
      
    } catch (error) {
      console.warn('Table extraction error:', error)
      return ''
    }
  }

  private convertToMarkdown(text: string, options: ScrapingOptions): string {
    let markdown = text
    
    // Clean up whitespace
    markdown = markdown.replace(/\s+/g, ' ').trim()
    
    // Split into paragraphs
    const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    
    // Format as markdown
    markdown = paragraphs.map(paragraph => {
      const trimmed = paragraph.trim()
      
      // Don't process very short paragraphs
      if (trimmed.length < 10) return trimmed
      
      // Add paragraph breaks
      return trimmed
    }).join('\n\n')
    
    // Remove code blocks if requested
    if (options.removeCodeBlocks) {
      markdown = markdown.replace(/```[\s\S]*?```/g, '')
      markdown = markdown.replace(/`[^`]+`/g, '')
    }
    
    return markdown
  }

  async close() {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Singleton instance
let scraperInstance: WebScraper | null = null

export async function getScraper(): Promise<WebScraper> {
  if (!scraperInstance) {
    scraperInstance = new WebScraper()
    await scraperInstance.initialize()
  }
  return scraperInstance
}

export async function scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
  const scraper = await getScraper()
  return scraper.scrapeUrl(url, options)
}

export async function scrapeUrls(urls: string[], options: ScrapingOptions & { maxConcurrent?: number } = {}): Promise<ScrapingResult[]> {
  const scraper = await getScraper()
  const maxConcurrent = options.maxConcurrent || 3 // Limit concurrent pages to avoid overload
  
  const results: ScrapingResult[] = []
  
  // Process URLs in batches to control concurrency
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent)
    const batchPromises = batch.map(url => scraper.scrapeUrl(url, options))
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // Create error result for failed promise
        results.push({
          success: false,
          url: batch[index],
          error: {
            code: 'PROMISE_REJECTED',
            message: result.reason?.message || 'Scraping promise rejected'
          },
          stats: {
            processingTime: 0,
            contentSize: 0,
            imageCount: 0
          },
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: options.userAgent || 'Knowledge Graph Platform Scraper'
          }
        })
      }
    })
    
    // Small delay between batches to be respectful to servers
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

export async function closeScraper() {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}

// Cleanup on process exit
process.on('exit', () => {
  if (scraperInstance) {
    scraperInstance.close().catch(console.error)
  }
})

process.on('SIGINT', async () => {
  if (scraperInstance) {
    await scraperInstance.close()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (scraperInstance) {
    await scraperInstance.close()
  }
  process.exit(0)
})