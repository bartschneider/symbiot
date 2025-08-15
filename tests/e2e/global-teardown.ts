import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3002'
  
  // Create a browser instance for cleanup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    console.log('🗑️ Cleaning up test data...')
    
    // Check if application is still running
    try {
      await page.goto(baseURL, { timeout: 5000 })
      console.log('📡 Application still running, proceeding with cleanup...')
    } catch (error) {
      console.log('⚠️ Application not accessible for cleanup, skipping...')
      return
    }
    
    // Generate test report summary
    console.log('📊 Generating test summary...')
    
    // Get final system status
    try {
      const healthResponse = await page.request.get(`${baseURL}/api/health`)
      if (healthResponse.status() === 200) {
        console.log('✅ System health check passed at teardown')
      } else {
        console.log('⚠️ System health check failed at teardown')
      }
    } catch (error) {
      console.log('⚠️ Could not perform final health check')
    }
    
    // Optional: Clean up test extraction sessions
    // Note: In a real scenario, you might want to clean up test data
    // For now, we'll leave test data for manual inspection
    
    console.log('📈 Test execution completed')
    console.log('📋 Test artifacts available in:')
    console.log('   - test-results/ (screenshots, videos, traces)')
    console.log('   - playwright-report/ (HTML report)')
    
    // Clean up environment variables
    delete process.env.TEST_BASE_URL
    delete process.env.TEST_SETUP_COMPLETE
    
    console.log('✨ Global teardown completed successfully!')
    
  } catch (error) {
    console.error('❌ Global teardown encountered error:', error)
    // Don't throw here to avoid masking test failures
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalTeardown