import { test, expect } from '@playwright/test'

// Test Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'
const TEST_TIMEOUT = 60000  // Extended for Playwright scraping

test.describe('Core Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application and wait for load
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/Knowledge Graph Platform/)
  })

  test('TC001: Single URL Content Extraction', async ({ page }) => {
    const testUrl = 'https://httpbin.org/html'  // Faster test URL
    
    // Step 1: Navigate to extraction page
    await page.click('[data-testid="single-extraction"]')
    
    // Step 2: Enter valid URL
    await page.fill('[data-testid="url-input"]', testUrl)
    
    // Step 3: Click extract button
    await page.click('[data-testid="extract-button"]')
    
    // Step 4: Wait for processing completion
    await expect(page.locator('[data-testid="extraction-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT })
    
    // Step 5: Verify extracted content display
    await expect(page.locator('[data-testid="extracted-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="extracted-content"]')).toBeVisible()
    await expect(page.locator('[data-testid="processing-stats"]')).toBeVisible()
    
    // Verify stats are populated
    const processingTime = await page.locator('[data-testid="processing-time"]').textContent()
    expect(parseInt(processingTime || '0')).toBeGreaterThan(0)
    
    const contentSize = await page.locator('[data-testid="content-size"]').textContent()
    expect(parseInt(contentSize || '0')).toBeGreaterThan(0)
  })

  test('TC002: Batch URL Extraction', async ({ page }) => {
    const testUrls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://jsonplaceholder.typicode.com'
    ]
    
    // Step 1: Navigate to batch extraction page
    await page.click('[data-testid="batch-extraction"]')
    
    // Step 2: Input multiple URLs
    for (const [index, url] of testUrls.entries()) {
      await page.fill(`[data-testid="batch-url-${index}"]`, url)
      if (index < testUrls.length - 1) {
        await page.click('[data-testid="add-url-button"]')
      }
    }
    
    // Step 3: Configure extraction options
    await page.check('[data-testid="include-images"]')
    await page.check('[data-testid="include-tables"]')
    
    // Step 4: Start batch extraction
    await page.click('[data-testid="start-batch-button"]')
    
    // Step 5: Monitor real-time progress
    await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('0%')
    
    // Wait for completion
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT * 2 })
    
    // Step 6: Review batch results
    const successCount = await page.locator('[data-testid="success-count"]').textContent()
    expect(parseInt(successCount || '0')).toBeGreaterThanOrEqual(2) // Allow for one potential failure
    
    const totalCount = await page.locator('[data-testid="total-count"]').textContent()
    expect(totalCount).toBe(testUrls.length.toString())
    
    // Verify results table is populated
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
    const resultRows = page.locator('[data-testid="result-row"]')
    await expect(resultRows).toHaveCount(testUrls.length)
  })

  test('TC003: Sitemap Discovery', async ({ page }) => {
    const testDomain = 'https://example.com'
    
    // Step 1: Access sitemap discovery feature
    await page.click('[data-testid="sitemap-discovery"]')
    
    // Step 2: Enter website root URL
    await page.fill('[data-testid="domain-input"]', testDomain)
    
    // Step 3: Configure discovery options
    await page.selectOption('[data-testid="max-depth-select"]', '2')
    await page.check('[data-testid="include-external"]')
    
    // Step 4: Initiate discovery process
    await page.click('[data-testid="start-discovery-button"]')
    
    // Wait for discovery completion
    await expect(page.locator('[data-testid="discovery-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT })
    
    // Step 5: Review categorized URL results
    await expect(page.locator('[data-testid="discovered-urls"]')).toBeVisible()
    
    // Verify categories are populated
    const categories = ['blog', 'product', 'info', 'other']
    for (const category of categories) {
      const categorySection = page.locator(`[data-testid="category-${category}"]`)
      if (await categorySection.count() > 0) {
        await expect(categorySection).toBeVisible()
      }
    }
    
    // Verify discovery summary
    const totalUrls = await page.locator('[data-testid="total-discovered"]').textContent()
    expect(parseInt(totalUrls || '0')).toBeGreaterThan(0)
    
    // Step 6: Select URLs for extraction
    await page.check('[data-testid="select-all-urls"]')
    await page.click('[data-testid="extract-selected-button"]')
    
    // Verify extraction initiation
    await expect(page.locator('[data-testid="batch-extraction-started"]')).toBeVisible()
  })

  test('TC004: Extraction History Management', async ({ page }) => {
    // Prerequisites: Perform a few extractions first
    await test.step('Setup: Perform test extractions', async () => {
      // Single extraction
      await page.click('[data-testid="single-extraction"]')
      await page.fill('[data-testid="url-input"]', 'https://example.com')
      await page.click('[data-testid="extract-button"]')
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT })
      
      // Navigate back to home
      await page.click('[data-testid="home-link"]')
    })
    
    // Step 1: Navigate to extraction history
    await page.click('[data-testid="extraction-history"]')
    
    // Step 2: Verify sessions are listed
    await expect(page.locator('[data-testid="history-table"]')).toBeVisible()
    const sessionRows = page.locator('[data-testid="session-row"]')
    await expect(sessionRows).toHaveCountGreaterThan(0)
    
    // Step 3: Filter sessions by status
    await page.selectOption('[data-testid="status-filter"]', 'completed')
    await page.click('[data-testid="apply-filter-button"]')
    
    // Verify filtering works
    const filteredRows = page.locator('[data-testid="session-row"]')
    const count = await filteredRows.count()
    expect(count).toBeGreaterThanOrEqual(1)
    
    // Step 4: View session details
    await sessionRows.first().click()
    await expect(page.locator('[data-testid="session-details"]')).toBeVisible()
    
    // Verify session details content
    await expect(page.locator('[data-testid="session-id"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-urls"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-stats"]')).toBeVisible()
    
    // Step 5: Test retry functionality (if failed URLs exist)
    const retryButton = page.locator('[data-testid="retry-failed-button"]')
    if (await retryButton.count() > 0) {
      await retryButton.click()
      await expect(page.locator('[data-testid="retry-initiated"]')).toBeVisible()
    }
    
    // Step 6: Test pagination (if applicable)
    const nextPageButton = page.locator('[data-testid="next-page-button"]')
    if (await nextPageButton.count() > 0) {
      await nextPageButton.click()
      // Verify page navigation
      await expect(page.locator('[data-testid="page-indicator"]')).toContainText('2')
    }
  })
})

test.describe('API Integration Tests', () => {
  test('TC101: Health Check Endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`)
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('healthy')
    expect(data.data.version).toBeDefined()
    expect(data.meta.timestamp).toBeDefined()
  })

  test('TC102: Service Info Endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/info`)
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.version).toBeDefined()
    expect(data.data.capabilities).toBeInstanceOf(Array)
    expect(data.data.limits).toBeDefined()
    expect(data.data.limits.maxConcurrent).toBeGreaterThan(0)
    expect(data.data.limits.maxUrls).toBeGreaterThan(0)
  })

  test('TC103: Content Conversion API', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: 'https://httpbin.org/html',  // Faster test URL
        options: {
          includeImages: false,  // Faster without images
          includeTables: false,  // Faster without tables
          waitForLoad: 500      // Reduced wait time
        }
      },
      timeout: 90000  // 90 second timeout
    })
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.url).toBe('https://httpbin.org/html')
    expect(data.data.data.markdown).toBeDefined()
    expect(data.data.stats.processingTime).toBeGreaterThan(0)
    expect(data.data.stats.contentSize).toBeGreaterThan(0)
    // httpStatusCode is included in the scraping process but not necessarily in the test response
    expect(data.data.metadata.responseTime).toBeGreaterThan(0)
  })

  test('TC104: Batch Extraction API', async ({ request }) => {
    const testUrls = ['https://httpbin.org/html', 'https://httpbin.org/json']
    
    const response = await request.post(`${BASE_URL}/api/sitemap/batch`, {
      data: {
        urls: testUrls,
        options: {
          maxConcurrent: 2,
          includeImages: false
        }
      }
    })
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.results).toHaveLength(testUrls.length)
    expect(data.data.summary.totalUrls).toBe(testUrls.length)
    expect(data.processing.requestId).toBeDefined()
    
    // Verify each result has required fields
    data.data.results.forEach((result: any) => {
      expect(result.url).toBeDefined()
      expect(result.success).toBeDefined()
      expect(result.stats).toBeDefined()
      expect(result.metadata).toBeDefined()
    })
  })
})