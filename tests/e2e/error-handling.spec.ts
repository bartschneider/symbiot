import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'
const TEST_TIMEOUT = 30000

test.describe('Error Handling Tests (Sad Path)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/Knowledge Graph Platform/)
  })

  test('TC301: Invalid URL Handling', async ({ page }) => {
    const invalidUrls = [
      'not-a-url',
      'ftp://invalid-protocol.com',
      'https://non-existent-domain-xyz123.com',
      'https://httpstat.us/404',
      'https://httpstat.us/500'
    ]

    await page.click('[data-testid="single-extraction"]')

    for (const invalidUrl of invalidUrls) {
      await test.step(`Testing invalid URL: ${invalidUrl}`, async () => {
        // Clear previous input
        await page.fill('[data-testid="url-input"]', '')
        
        // Enter invalid URL
        await page.fill('[data-testid="url-input"]', invalidUrl)
        
        if (invalidUrl === 'not-a-url' || invalidUrl.startsWith('ftp://')) {
          // Test client-side validation
          await page.click('[data-testid="extract-button"]')
          await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
          await expect(page.locator('[data-testid="validation-error"]')).toContainText(/invalid.*url/i)
        } else {
          // Test server-side error handling
          await page.click('[data-testid="extract-button"]')
          
          // Wait for processing to complete (should fail)
          await expect(page.locator('[data-testid="extraction-status"]')).toContainText(/failed|error/i, { timeout: TEST_TIMEOUT })
          
          // Verify error message is displayed
          await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
          const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
          expect(errorMessage).toBeTruthy()
          
          // Verify error is recorded in stats
          const errorCode = await page.locator('[data-testid="error-code"]').textContent()
          expect(errorCode).toBeTruthy()
        }
      })
    }
  })

  test('TC302: Network Failure Scenarios', async ({ page }) => {
    // Test timeout simulation
    await test.step('Timeout Simulation', async () => {
      await page.click('[data-testid="single-extraction"]')
      
      // Configure very short timeout
      await page.click('[data-testid="advanced-options"]')
      await page.fill('[data-testid="timeout-input"]', '1000') // 1 second timeout
      
      // Try to extract from a slow endpoint
      await page.fill('[data-testid="url-input"]', 'https://httpbin.org/delay/5')
      await page.click('[data-testid="extract-button"]')
      
      // Should timeout and show appropriate error
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText(/timeout|failed/i, { timeout: 10000 })
      await expect(page.locator('[data-testid="error-code"]')).toContainText(/timeout/i)
    })

    // Test connection refused
    await test.step('Connection Refused', async () => {
      // Reset form
      await page.click('[data-testid="reset-form-button"]')
      
      // Try to access localhost on unused port
      await page.fill('[data-testid="url-input"]', 'http://localhost:9999')
      await page.click('[data-testid="extract-button"]')
      
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText(/failed|error/i, { timeout: TEST_TIMEOUT })
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    })

    // Test DNS resolution failure
    await test.step('DNS Resolution Failure', async () => {
      await page.click('[data-testid="reset-form-button"]')
      
      await page.fill('[data-testid="url-input"]', 'https://this-domain-definitely-does-not-exist-123456.com')
      await page.click('[data-testid="extract-button"]')
      
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText(/failed|error/i, { timeout: TEST_TIMEOUT })
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
      expect(errorMessage?.toLowerCase()).toContain('dns')
    })
  })

  test('TC303: Rate Limiting and Overload', async ({ page }) => {
    // Test URL limit enforcement
    await test.step('URL Limit Enforcement', async () => {
      await page.click('[data-testid="batch-extraction"]')
      
      // Try to add more than maximum allowed URLs (25)
      for (let i = 0; i < 30; i++) {
        await page.fill(`[data-testid="batch-url-${i}"]`, `https://example.com/page-${i}`)
        if (i < 29) {
          await page.click('[data-testid="add-url-button"]')
        }
      }
      
      // Should show validation error
      await expect(page.locator('[data-testid="url-limit-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="url-limit-error"]')).toContainText(/maximum.*25/i)
      
      // Extract button should be disabled
      await expect(page.locator('[data-testid="start-batch-button"]')).toBeDisabled()
    })

    // Test concurrent request handling
    await test.step('Concurrent Request Management', async () => {
      // Reset to valid number of URLs
      await page.click('[data-testid="reset-batch-form"]')
      
      // Add maximum allowed URLs
      for (let i = 0; i < 25; i++) {
        await page.fill(`[data-testid="batch-url-${i}"]`, `https://httpbin.org/delay/${Math.floor(Math.random() * 3) + 1}`)
        if (i < 24) {
          await page.click('[data-testid="add-url-button"]')
        }
      }
      
      // Start extraction
      await page.click('[data-testid="start-batch-button"]')
      
      // Monitor that processing is throttled (not all URLs processed simultaneously)
      await expect(page.locator('[data-testid="concurrent-processing"]')).toBeVisible()
      
      // Should show concurrent limit information
      const concurrentLimit = await page.locator('[data-testid="concurrent-limit"]').textContent()
      expect(parseInt(concurrentLimit || '0')).toBeLessThanOrEqual(5)
      
      // Wait for completion
      await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT * 3 })
    })
  })

  test('TC304: Graceful Error Recovery', async ({ page }) => {
    // Test error recovery workflow
    await test.step('Mixed Success/Failure Batch', async () => {
      await page.click('[data-testid="batch-extraction"]')
      
      const mixedUrls = [
        'https://example.com',           // Should succeed
        'https://httpstat.us/404',       // Should fail
        'https://httpbin.org/html',      // Should succeed
        'https://httpstat.us/500',       // Should fail
        'https://jsonplaceholder.typicode.com' // Should succeed
      ]
      
      // Fill in URLs
      for (const [index, url] of mixedUrls.entries()) {
        await page.fill(`[data-testid="batch-url-${index}"]`, url)
        if (index < mixedUrls.length - 1) {
          await page.click('[data-testid="add-url-button"]')
        }
      }
      
      // Start batch extraction
      await page.click('[data-testid="start-batch-button"]')
      
      // Wait for completion
      await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT })
      
      // Verify mixed results
      const successCount = await page.locator('[data-testid="success-count"]').textContent()
      const failureCount = await page.locator('[data-testid="failure-count"]').textContent()
      
      expect(parseInt(successCount || '0')).toBeGreaterThan(0)
      expect(parseInt(failureCount || '0')).toBeGreaterThan(0)
      
      // Verify failure details are shown
      await expect(page.locator('[data-testid="failed-urls-section"]')).toBeVisible()
      
      // Test retry functionality
      await page.click('[data-testid="retry-failed-button"]')
      await expect(page.locator('[data-testid="retry-confirmation"]')).toBeVisible()
      
      // Confirm retry
      await page.click('[data-testid="confirm-retry-button"]')
      await expect(page.locator('[data-testid="retry-in-progress"]')).toBeVisible()
    })

    // Test error state reset
    await test.step('Error State Reset', async () => {
      // Navigate to single extraction
      await page.click('[data-testid="single-extraction"]')
      
      // Trigger an error
      await page.fill('[data-testid="url-input"]', 'https://httpstat.us/404')
      await page.click('[data-testid="extract-button"]')
      
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText(/failed|error/i, { timeout: TEST_TIMEOUT })
      
      // Reset and try with valid URL
      await page.click('[data-testid="reset-form-button"]')
      
      // Verify error state is cleared
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText('ready')
      
      // Try successful extraction
      await page.fill('[data-testid="url-input"]', 'https://example.com')
      await page.click('[data-testid="extract-button"]')
      
      await expect(page.locator('[data-testid="extraction-status"]')).toContainText('completed', { timeout: TEST_TIMEOUT })
    })
  })
})

test.describe('Database Error Handling', () => {
  test('TC305: Database Connection Resilience', async ({ request }) => {
    // Test API behavior when database operations might fail
    
    // Test with valid extraction that should create database records
    const response = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: 'https://example.com',
        options: {
          includeImages: false,
          includeTables: false
        }
      }
    })
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.meta.sessionId).toBeDefined()
    
    // Verify session was created by checking history
    const historyResponse = await request.get(`${BASE_URL}/api/extraction-history/sessions`)
    expect(historyResponse.status()).toBe(200)
    
    const historyData = await historyResponse.json()
    expect(historyData.success).toBe(true)
    expect(historyData.data.sessions).toBeInstanceOf(Array)
    expect(historyData.data.sessions.length).toBeGreaterThan(0)
  })

  test('TC306: API Error Response Format', async ({ request }) => {
    // Test that API errors follow consistent format
    
    // Test with invalid request body
    const invalidResponse = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        // Missing required 'url' field
        options: {
          includeImages: true
        }
      }
    })
    
    expect(invalidResponse.status()).toBe(400)
    
    const errorData = await invalidResponse.json()
    expect(errorData.success).toBe(false)
    expect(errorData.error).toBeDefined()
    expect(errorData.error.code).toBeDefined()
    expect(errorData.error.message).toBeDefined()
    expect(errorData.meta).toBeDefined()
    expect(errorData.meta.timestamp).toBeDefined()
  })
})