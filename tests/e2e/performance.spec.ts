import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'

test.describe('Performance Tests', () => {
  test('TC401: Single URL Performance Benchmarks', async ({ request }) => {
    const performanceResults: Array<{
      url: string
      processingTime: number
      contentSize: number
      httpStatusCode?: number
    }> = []

    const testUrls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://jsonplaceholder.typicode.com',
      'https://httpstat.us/200'
    ]

    for (const testUrl of testUrls) {
      await test.step(`Performance test for ${testUrl}`, async () => {
        const startTime = Date.now()
        
        const response = await request.post(`${BASE_URL}/api/convert`, {
          data: {
            url: testUrl,
            options: {
              includeImages: false, // Faster for performance testing
              includeTables: true,
              waitForLoad: 1000 // Reduced wait time
            }
          }
        })
        
        const endTime = Date.now()
        const totalResponseTime = endTime - startTime
        
        expect(response.status()).toBe(200)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        
        const result = {
          url: testUrl,
          processingTime: data.data.stats.processingTime,
          contentSize: data.data.stats.contentSize,
          httpStatusCode: data.data.metadata.httpStatusCode,
          totalResponseTime
        }
        
        performanceResults.push(result)
        
        // Performance assertions
        expect(result.processingTime).toBeLessThan(10000) // < 10 seconds
        expect(result.totalResponseTime).toBeLessThan(15000) // < 15 seconds including network
        expect(result.contentSize).toBeGreaterThan(0)
        
        console.log(`Performance: ${testUrl}`)
        console.log(`  Processing Time: ${result.processingTime}ms`)
        console.log(`  Total Response Time: ${result.totalResponseTime}ms`)
        console.log(`  Content Size: ${result.contentSize} bytes`)
        console.log(`  HTTP Status: ${result.httpStatusCode}`)
      })
    }
    
    // Calculate average performance
    const avgProcessingTime = performanceResults.reduce((sum, r) => sum + r.processingTime, 0) / performanceResults.length
    const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.totalResponseTime, 0) / performanceResults.length
    
    console.log(`\nAverage Performance:`)
    console.log(`  Processing Time: ${avgProcessingTime.toFixed(2)}ms`)
    console.log(`  Total Response Time: ${avgResponseTime.toFixed(2)}ms`)
    
    // Performance criteria
    expect(avgProcessingTime).toBeLessThan(7000) // Average < 7 seconds
    expect(avgResponseTime).toBeLessThan(12000) // Average < 12 seconds
  })

  test('TC402: Batch Processing Performance', async ({ request }) => {
    const batchUrls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://jsonplaceholder.typicode.com',
      'https://httpstat.us/200',
      'https://httpbin.org/json'
    ]
    
    const startTime = Date.now()
    
    const response = await request.post(`${BASE_URL}/api/sitemap/batch`, {
      data: {
        urls: batchUrls,
        options: {
          maxConcurrent: 3, // Test concurrent processing
          includeImages: false,
          includeTables: false,
          waitForLoad: 1000
        }
      }
    })
    
    const endTime = Date.now()
    const totalBatchTime = endTime - startTime
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    
    // Performance validation
    const summary = data.data.summary
    expect(summary.totalUrls).toBe(batchUrls.length)
    expect(summary.successful).toBeGreaterThanOrEqual(3) // Allow for some failures
    
    // Calculate performance metrics
    const avgTimePerUrl = summary.totalProcessingTime / summary.totalUrls
    const concurrencyEfficiency = totalBatchTime / (summary.totalProcessingTime / 3) // Expected 3 concurrent
    
    console.log(`Batch Performance Metrics:`)
    console.log(`  Total Batch Time: ${totalBatchTime}ms`)
    console.log(`  Total Processing Time: ${summary.totalProcessingTime}ms`)
    console.log(`  Average Time per URL: ${avgTimePerUrl.toFixed(2)}ms`)
    console.log(`  Concurrency Efficiency: ${concurrencyEfficiency.toFixed(2)}`)
    console.log(`  Success Rate: ${summary.successRate.toFixed(1)}%`)
    
    // Performance criteria
    expect(totalBatchTime).toBeLessThan(30000) // Total batch < 30 seconds
    expect(avgTimePerUrl).toBeLessThan(8000) // Average per URL < 8 seconds
    expect(concurrencyEfficiency).toBeLessThan(1.5) // Reasonable concurrency benefit
    expect(summary.successRate).toBeGreaterThan(60) // At least 60% success rate
  })

  test('TC403: API Response Time Monitoring', async ({ request }) => {
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedTime: 100 },
      { path: '/api/info', method: 'GET', expectedTime: 200 },
      { path: '/api/extraction-history/sessions', method: 'GET', expectedTime: 500 }
    ]
    
    for (const endpoint of endpoints) {
      await test.step(`Response time test for ${endpoint.path}`, async () => {
        const measurements: number[] = []
        
        // Take 5 measurements
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now()
          
          const response = endpoint.method === 'GET' 
            ? await request.get(`${BASE_URL}${endpoint.path}`)
            : await request.post(`${BASE_URL}${endpoint.path}`)
          
          const responseTime = Date.now() - startTime
          measurements.push(responseTime)
          
          expect(response.status()).toBe(200)
          
          // Small delay between measurements
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Calculate statistics
        const avgResponseTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length
        const maxResponseTime = Math.max(...measurements)
        const minResponseTime = Math.min(...measurements)
        
        console.log(`${endpoint.path} Response Times:`)
        console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`)
        console.log(`  Min: ${minResponseTime}ms`)
        console.log(`  Max: ${maxResponseTime}ms`)
        console.log(`  All measurements: ${measurements.join(', ')}ms`)
        
        // Performance assertions
        expect(avgResponseTime).toBeLessThan(endpoint.expectedTime)
        expect(maxResponseTime).toBeLessThan(endpoint.expectedTime * 2) // Allow 2x variance for max
      })
    }
  })

  test('TC404: Memory Usage Monitoring', async ({ page }) => {
    // Monitor browser memory usage during intensive operations
    await page.goto(BASE_URL)
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    })
    
    if (initialMemory) {
      console.log('Initial Memory Usage:', initialMemory)
    }
    
    // Perform intensive operations
    await page.click('[data-testid="batch-extraction"]')
    
    // Add multiple URLs
    const testUrls = Array.from({ length: 10 }, (_, i) => `https://httpbin.org/html?page=${i}`)
    for (const [index, url] of testUrls.entries()) {
      await page.fill(`[data-testid="batch-url-${index}"]`, url)
      if (index < testUrls.length - 1) {
        await page.click('[data-testid="add-url-button"]')
      }
    }
    
    // Start extraction
    await page.click('[data-testid="start-batch-button"]')
    
    // Monitor memory during processing
    const memoryDuringProcessing = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    })
    
    if (memoryDuringProcessing && initialMemory) {
      const memoryIncrease = memoryDuringProcessing.usedJSHeapSize - initialMemory.usedJSHeapSize
      console.log('Memory During Processing:', memoryDuringProcessing)
      console.log('Memory Increase:', memoryIncrease, 'bytes')
      
      // Memory usage should not increase excessively (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    }
    
    // Wait for completion
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed', { timeout: 60000 })
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    })
    
    if (finalMemory && initialMemory) {
      const finalIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      console.log('Final Memory Usage:', finalMemory)
      console.log('Final Memory Increase:', finalIncrease, 'bytes')
      
      // Memory should not leak significantly after operations
      expect(finalIncrease).toBeLessThan(20 * 1024 * 1024) // < 20MB permanent increase
    }
  })

  test('TC405: Database Performance', async ({ request }) => {
    // Test database query performance with multiple sessions
    const sessionCreationTimes: number[] = []
    const historyQueryTimes: number[] = []
    
    // Create multiple extraction sessions
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      
      const response = await request.post(`${BASE_URL}/api/convert`, {
        data: {
          url: `https://example.com/test-${i}`,
          options: { includeImages: false }
        }
      })
      
      const sessionTime = Date.now() - startTime
      sessionCreationTimes.push(sessionTime)
      
      expect(response.status()).toBe(200)
    }
    
    // Query extraction history multiple times
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      const response = await request.get(`${BASE_URL}/api/extraction-history/sessions?page=1&limit=10`)
      
      const queryTime = Date.now() - startTime
      historyQueryTimes.push(queryTime)
      
      expect(response.status()).toBe(200)
    }
    
    // Calculate averages
    const avgSessionTime = sessionCreationTimes.reduce((sum, time) => sum + time, 0) / sessionCreationTimes.length
    const avgHistoryQueryTime = historyQueryTimes.reduce((sum, time) => sum + time, 0) / historyQueryTimes.length
    
    console.log('Database Performance:')
    console.log(`  Average Session Creation: ${avgSessionTime.toFixed(2)}ms`)
    console.log(`  Average History Query: ${avgHistoryQueryTime.toFixed(2)}ms`)
    
    // Performance criteria
    expect(avgSessionTime).toBeLessThan(15000) // Session creation < 15 seconds (includes scraping)
    expect(avgHistoryQueryTime).toBeLessThan(1000) // History query < 1 second
  })
})