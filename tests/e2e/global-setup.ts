import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3002'
  
  // Create a browser instance for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    console.log(`📡 Checking if application is running at ${baseURL}...`)
    
    // Wait for the application to be ready
    let retries = 0
    const maxRetries = 30
    
    while (retries < maxRetries) {
      try {
        await page.goto(baseURL, { timeout: 5000 })
        await page.waitForSelector('body', { timeout: 5000 })
        console.log('✅ Application is ready!')
        break
      } catch (error) {
        retries++
        console.log(`⏳ Waiting for application... (${retries}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (retries === maxRetries) {
          throw new Error(`❌ Application not ready after ${maxRetries} attempts`)
        }
      }
    }
    
    // Verify API endpoints are working
    console.log('🔍 Verifying API endpoints...')
    
    const healthResponse = await page.request.get(`${baseURL}/api/health`)
    if (healthResponse.status() !== 200) {
      throw new Error(`❌ Health check failed with status ${healthResponse.status()}`)
    }
    console.log('✅ Health check passed')
    
    const infoResponse = await page.request.get(`${baseURL}/api/info`)
    if (infoResponse.status() !== 200) {
      throw new Error(`❌ Info endpoint failed with status ${infoResponse.status()}`)
    }
    console.log('✅ Info endpoint working')
    
    // Setup test data if needed
    console.log('📝 Setting up test data...')
    
    // Create a test extraction session for history tests (with extended timeout)
    const testExtractionResponse = await page.request.post(`${baseURL}/api/convert`, {
      data: {
        url: 'https://httpbin.org/html',  // Faster test URL
        options: {
          includeImages: false,
          includeTables: false,
          waitForLoad: 500
        }
      },
      timeout: 60000  // 60 second timeout for Playwright scraping
    })
    
    if (testExtractionResponse.status() === 200) {
      console.log('✅ Test extraction session created')
    } else {
      console.log('⚠️ Warning: Could not create test extraction session')
    }
    
    // Store global test state
    process.env.TEST_BASE_URL = baseURL
    process.env.TEST_SETUP_COMPLETE = 'true'
    
    console.log('🎉 Global setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup