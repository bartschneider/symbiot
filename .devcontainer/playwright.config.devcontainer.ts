import { defineConfig, devices } from '@playwright/test'

/**
 * Dev Container Playwright Configuration
 * Optimized for containerized development with service mesh
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  
  reporter: [
    ['html', { 
      outputFolder: 'test-results/reports/playwright-report',
      open: 'never'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  use: {
    // Dev container service URLs
    baseURL: 'http://frontend-testing:5173',
    
    // Enhanced debugging and tracing
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Extended timeouts for container environment
    navigationTimeout: 90000,
    actionTimeout: 45000,
    
    // Custom test context
    extraHTTPHeaders: {
      'Accept': 'application/json, text/html',
      'User-Agent': 'KGP-E2E-Tests/1.0 (Dev Container)'
    }
  },

  projects: [
    // Core browser testing
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true
          }
        }
      },
    },

    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
    },

    // Phase 3.5 LLM-specific testing
    {
      name: 'phase35-llm',
      testMatch: '**/phase35-*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Test-Suite': 'Phase35-LLM',
          'Accept': 'application/json'
        }
      },
      timeout: 180000  // Extended timeout for LLM operations
    },

    // Performance testing
    {
      name: 'performance',
      testMatch: '**/performance.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Test-Suite': 'Performance'
        }
      },
      timeout: 240000  // Extended timeout for performance tests
    }
  ],

  // Dev container service configuration
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  
  // No webServer needed - services run independently in dev container
  webServer: undefined,
  
  timeout: 120000,  // 2 minutes default
  expect: {
    timeout: 15000
  },
  
  outputDir: 'test-results/',
  testMatch: '**/*.spec.ts',
  globalTimeout: 900000, // 15 minutes for all tests
  
  // Environment-specific grep patterns
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,
  grepInvert: process.env.TEST_GREP_INVERT ? new RegExp(process.env.TEST_GREP_INVERT) : undefined,
  
  // Dev container specific configuration
  metadata: {
    environment: 'dev-container',
    services: {
      frontend: 'http://frontend-testing:5173',
      api: 'http://firecrawl-service:3001',
      database: 'postgres-testing:5432',
      redis: 'redis-testing:6379'
    }
  }
})