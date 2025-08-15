import { test, expect } from '@playwright/test'

// Test Configuration for JL Collins Stock Series
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const TARGET_URL = 'https://jlcollinsnh.com/stock-series/'
const TEST_TIMEOUT = 120000  // 2 minutes for complex page

test.describe('JL Collins Stock Series E2E Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for this specific test
    test.setTimeout(300000) // 5 minutes total
  })

  test('TC_JLCOLLINS_001: Extract JL Collins Stock Series Content', async ({ page, request }) => {
    // Step 1: Test API endpoint directly first
    console.log('Testing API endpoint with target URL:', TARGET_URL)
    
    const startTime = Date.now()
    
    const response = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: TARGET_URL,
        options: {
          includeImages: true,
          includeTables: true,
          waitForLoad: 2000
        }
      },
      timeout: 180000  // 3 minute timeout
    })
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    // Step 2: Verify response status
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    console.log('API Response received, parsing data...')
    
    // Step 3: Verify response structure
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.url).toBe(TARGET_URL)
    expect(data.data.data.markdown).toBeDefined()
    expect(data.data.stats).toBeDefined()
    expect(data.data.metadata).toBeDefined()
    
    // Step 4: Verify content quality
    const markdown = data.data.data.markdown
    const stats = data.data.stats
    const metadata = data.data.metadata
    
    // Content should contain expected keywords for stock series
    expect(markdown).toContain('stock')
    expect(markdown).toContain('invest')
    expect(markdown).toContain('Simple path to wealth')
    
    // Verify reasonable content size
    expect(markdown.length).toBeGreaterThan(1000)
    expect(stats.contentSize).toBeGreaterThan(1000)
    
    // Verify processing stats
    expect(stats.processingTime).toBeGreaterThan(0)
    expect(stats.processingTime).toBeLessThan(180000) // Should complete within 3 minutes
    
    // Verify metadata
    expect(metadata.responseTime).toBeGreaterThan(0)
    expect(metadata.title).toBeDefined()
    expect(metadata.title.length).toBeGreaterThan(0)
    
    // Step 5: Log detailed results
    console.log('=== JL Collins Stock Series Extraction Results ===')
    console.log(`Target URL: ${TARGET_URL}`)
    console.log(`Processing Time: ${processingTime}ms`)
    console.log(`Content Size: ${stats.contentSize} characters`)
    console.log(`Title: ${metadata.title}`)
    console.log(`Response Time: ${metadata.responseTime}ms`)
    console.log(`Success: ${data.success}`)
    
    // Log content preview
    const contentPreview = markdown.substring(0, 500)
    console.log(`Content Preview: ${contentPreview}...`)
    
    // Log any tables found
    const tableCount = (markdown.match(/\|.*\|/g) || []).length
    console.log(`Tables Found: ${tableCount}`)
    
    // Log any images found
    const imageCount = (markdown.match(/!\[.*\]\(.*\)/g) || []).length
    console.log(`Images Found: ${imageCount}`)
    
    // Step 6: Verify specific content elements
    // Check for navigation and key series elements
    const hasStockSeriesContent = 
      markdown.toLowerCase().includes('stock series') ||
      markdown.toLowerCase().includes('simple path') ||
      markdown.toLowerCase().includes('wealth') ||
      markdown.toLowerCase().includes('index fund')
    
    expect(hasStockSeriesContent).toBe(true)
    
    // Step 7: Performance validation
    expect(processingTime).toBeLessThan(180000) // Should complete within 3 minutes
    expect(stats.contentSize).toBeGreaterThan(500) // Reasonable minimum content
    
    console.log('=== Test Completed Successfully ===')
  })

  test('TC_JLCOLLINS_002: Content Structure Analysis', async ({ request }) => {
    console.log('Analyzing content structure for:', TARGET_URL)
    
    const response = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: TARGET_URL,
        options: {
          includeImages: true,
          includeTables: true,
          waitForLoad: 2000
        }
      },
      timeout: 180000
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    const markdown = data.data.data.markdown
    
    // Analyze content structure
    const lines = markdown.split('\n')
    const headings = lines.filter(line => line.startsWith('#'))
    const links = (markdown.match(/\[.*?\]\(.*?\)/g) || [])
    const paragraphs = lines.filter(line => line.trim().length > 50 && !line.startsWith('#'))
    
    console.log('=== Content Structure Analysis ===')
    console.log(`Total Lines: ${lines.length}`)
    console.log(`Headings Found: ${headings.length}`)
    console.log(`Links Found: ${links.length}`)
    console.log(`Paragraphs: ${paragraphs.length}`)
    
    // Verify reasonable structure
    expect(headings.length).toBeGreaterThan(0)
    expect(links.length).toBeGreaterThan(0)
    expect(paragraphs.length).toBeGreaterThan(5)
    
    // Log sample headings
    console.log('Sample Headings:')
    headings.slice(0, 5).forEach((heading, i) => {
      console.log(`  ${i + 1}. ${heading.trim()}`)
    })
    
    // Log sample links
    console.log('Sample Links:')
    links.slice(0, 5).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`)
    })
  })

  test('TC_JLCOLLINS_003: Error Handling Test', async ({ request }) => {
    console.log('Testing error handling with invalid variations...')
    
    // Test with timeout scenario - very short timeout
    const timeoutResponse = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: TARGET_URL,
        options: {
          includeImages: false,
          includeTables: false,
          waitForLoad: 100  // Very short wait
        }
      },
      timeout: 5000  // 5 second timeout
    })
    
    // Should still succeed but may have different timing
    const timeoutStatus = timeoutResponse.status()
    console.log(`Timeout test response status: ${timeoutStatus}`)
    
    if (timeoutStatus === 200) {
      const timeoutData = await timeoutResponse.json()
      console.log(`Quick extraction completed: ${timeoutData.success}`)
      console.log(`Quick processing time: ${timeoutData.data.stats.processingTime}ms`)
    }
    
    // Test with malformed URL (should handle gracefully)
    const invalidResponse = await request.post(`${BASE_URL}/api/convert`, {
      data: {
        url: 'https://jlcollinsnh.com/nonexistent-page-12345',
        options: {
          includeImages: false,
          includeTables: false,
          waitForLoad: 1000
        }
      },
      timeout: 60000
    })
    
    console.log(`Invalid URL test status: ${invalidResponse.status()}`)
    
    if (invalidResponse.status() === 200) {
      const invalidData = await invalidResponse.json()
      console.log(`Invalid URL handled: ${invalidData.success}`)
    }
  })
})

test.describe('Performance Benchmarks', () => {
  test('TC_JLCOLLINS_PERF_001: Performance Benchmark', async ({ request }) => {
    const iterations = 3
    const results = []
    
    console.log(`Running ${iterations} performance iterations...`)
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      
      const response = await request.post(`${BASE_URL}/api/convert`, {
        data: {
          url: TARGET_URL,
          options: {
            includeImages: false,  // Faster without images
            includeTables: true,
            waitForLoad: 1000
          }
        },
        timeout: 120000
      })
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      if (response.status() === 200) {
        const data = await response.json()
        results.push({
          iteration: i + 1,
          totalTime,
          processingTime: data.data.stats.processingTime,
          contentSize: data.data.stats.contentSize,
          success: data.success
        })
        
        console.log(`Iteration ${i + 1}: ${totalTime}ms total, ${data.data.stats.processingTime}ms processing`)
      }
    }
    
    // Calculate averages
    const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    const avgContentSize = results.reduce((sum, r) => sum + r.contentSize, 0) / results.length
    
    console.log('=== Performance Benchmark Results ===')
    console.log(`Iterations: ${iterations}`)
    console.log(`Average Total Time: ${avgTotalTime.toFixed(2)}ms`)
    console.log(`Average Processing Time: ${avgProcessingTime.toFixed(2)}ms`)
    console.log(`Average Content Size: ${avgContentSize.toFixed(0)} characters`)
    console.log(`Success Rate: ${results.filter(r => r.success).length}/${iterations}`)
    
    // Verify performance thresholds
    expect(avgTotalTime).toBeLessThan(180000) // Average under 3 minutes
    expect(results.filter(r => r.success).length).toBe(iterations) // All should succeed
  })
})