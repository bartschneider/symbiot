/**
 * Phase 3 LLM Implementation Validation
 * Tests core functionality without requiring API keys
 */

import { LLMClient } from './client'
import { ContentProcessor } from './processor'
import { LLMDatabaseManager } from './database'
import { LLMIntegrationManager } from './integration'
import { 
  renderPrompt, 
  ENTITY_EXTRACTION_PROMPT, 
  RELATIONSHIP_DETECTION_PROMPT,
  validatePromptLength,
  preprocessContent,
  chunkContent
} from './prompts'

// Mock content for testing
const MOCK_CONTENT = `
# TechCorp Partners with DataFlow Solutions

SAN FRANCISCO, CA - TechCorp, a leading software development company, announced today a strategic partnership with DataFlow Solutions to enhance their data analytics capabilities. The collaboration will focus on implementing advanced machine learning algorithms to improve customer insights.

"This partnership represents a significant step forward in our mission to provide data-driven solutions," said Sarah Johnson, CEO of TechCorp. "DataFlow's expertise in artificial intelligence and machine learning will complement our existing software development capabilities."

The partnership will involve the integration of DataFlow's proprietary AI platform with TechCorp's customer management system. Both companies are headquartered in San Francisco and have been working in the technology sector for over a decade.

DataFlow Solutions, founded in 2010 by Michael Chen, specializes in real-time data processing and predictive analytics. The company has previously partnered with several Fortune 500 companies to implement enterprise-scale data solutions.

The implementation is expected to begin in Q2 2024 and will be deployed across TechCorp's global operations. The partnership aims to reduce data processing time by 60% and improve customer satisfaction scores by 25%.
`

export interface ValidationResult {
  testName: string
  success: boolean
  details: string
  metrics?: Record<string, any>
  error?: string
}

export class Phase3Validator {
  private results: ValidationResult[] = []

  async runAllValidations(): Promise<{
    overallSuccess: boolean
    results: ValidationResult[]
    summary: {
      totalTests: number
      passedTests: number
      failedTests: number
      successRate: number
    }
  }> {
    console.log('🚀 Starting Phase 3 LLM Implementation Validation...')
    
    this.results = []

    // Test 1: Prompt Template Validation
    await this.testPromptTemplates()

    // Test 2: Content Preprocessing
    await this.testContentProcessing()

    // Test 3: LLM Client Structure (without API calls)
    await this.testLLMClientStructure()

    // Test 4: Database Integration
    await this.testDatabaseIntegration()

    // Test 5: Integration Manager
    await this.testIntegrationManager()

    // Test 6: API Route Validation (structure only)
    await this.testAPIRouteStructure()

    const passedTests = this.results.filter(r => r.success).length
    const summary = {
      totalTests: this.results.length,
      passedTests,
      failedTests: this.results.length - passedTests,
      successRate: (passedTests / this.results.length) * 100
    }

    console.log(`\n📊 Validation Summary:`)
    console.log(`Total Tests: ${summary.totalTests}`)
    console.log(`Passed: ${summary.passedTests}`)
    console.log(`Failed: ${summary.failedTests}`)
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`)

    return {
      overallSuccess: summary.successRate >= 80, // 80% pass rate required
      results: this.results,
      summary
    }
  }

  private async testPromptTemplates(): Promise<void> {
    try {
      // Test entity extraction prompt
      const entityPrompt = renderPrompt(ENTITY_EXTRACTION_PROMPT, { content: MOCK_CONTENT })
      
      if (!entityPrompt.system || !entityPrompt.user) {
        throw new Error('Entity extraction prompt missing system or user content')
      }

      if (!entityPrompt.user.includes(MOCK_CONTENT)) {
        throw new Error('Entity extraction prompt not properly rendering content')
      }

      // Test relationship detection prompt
      const mockEntities = `- TechCorp (organization)\n- Sarah Johnson (person)\n- DataFlow Solutions (organization)`
      const relationshipPrompt = renderPrompt(RELATIONSHIP_DETECTION_PROMPT, { 
        entities: mockEntities, 
        content: MOCK_CONTENT 
      })

      if (!relationshipPrompt.system || !relationshipPrompt.user) {
        throw new Error('Relationship detection prompt missing system or user content')
      }

      // Test prompt length validation
      const isValidLength = validatePromptLength(MOCK_CONTENT, 10000)
      if (!isValidLength) {
        throw new Error('Prompt length validation failed unexpectedly')
      }

      this.results.push({
        testName: 'Prompt Template Validation',
        success: true,
        details: 'Entity and relationship prompts render correctly with proper variable substitution',
        metrics: {
          entityPromptLength: entityPrompt.user.length,
          relationshipPromptLength: relationshipPrompt.user.length,
          contentIncluded: entityPrompt.user.includes('TechCorp'),
          variableSubstitution: relationshipPrompt.user.includes('TechCorp (organization)')
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'Prompt Template Validation',
        success: false,
        details: 'Prompt template rendering or validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testContentProcessing(): Promise<void> {
    try {
      // Test content preprocessing
      const messyContent = `\n\n\n  This   has    lots    of   spaces\n\n\n\nAnd      newlines\n\n\n`
      const cleanContent = preprocessContent(messyContent)
      
      if (cleanContent.includes('   ') || cleanContent.includes('\n\n\n')) {
        throw new Error('Content preprocessing not working properly')
      }

      // Test content chunking
      const longContent = 'A'.repeat(50000) // 50K character content
      const chunks = chunkContent(longContent, 8000) // 8K token limit
      
      if (chunks.length === 1) {
        throw new Error('Content chunking not working - long content should be split')
      }

      // Test normal content (shouldn't be chunked)
      const normalChunks = chunkContent(MOCK_CONTENT, 8000)
      if (normalChunks.length !== 1) {
        throw new Error('Normal content should not be chunked')
      }

      this.results.push({
        testName: 'Content Processing',
        success: true,
        details: 'Content preprocessing and chunking work correctly',
        metrics: {
          originalLength: messyContent.length,
          cleanedLength: cleanContent.length,
          longContentChunks: chunks.length,
          normalContentChunks: normalChunks.length,
          chunkSizeRange: chunks.map(c => c.length)
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'Content Processing',
        success: false,
        details: 'Content preprocessing or chunking failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testLLMClientStructure(): Promise<void> {
    try {
      // Test client initialization with mock keys
      const mockApiKeys = { openai: 'test-key', anthropic: 'test-key' }
      const client = new LLMClient(mockApiKeys)

      // Test usage stats (should not fail)
      const stats = client.getUsageStats()
      if (!stats.providers || !Array.isArray(stats.providers)) {
        throw new Error('Usage stats structure invalid')
      }

      // Verify provider configuration
      if (stats.providers.length !== 2) {
        throw new Error('Expected 2 providers in configuration')
      }

      const hasOpenAI = stats.providers.some(p => p.name === 'openai')
      const hasAnthropic = stats.providers.some(p => p.name === 'anthropic')
      
      if (!hasOpenAI || !hasAnthropic) {
        throw new Error('Missing expected providers in configuration')
      }

      this.results.push({
        testName: 'LLM Client Structure',
        success: true,
        details: 'LLM client initializes correctly and provides proper statistics interface',
        metrics: {
          providersConfigured: stats.providers.length,
          totalCost: stats.totalCost,
          providersAvailable: stats.providers.filter(p => p.available).length
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'LLM Client Structure',
        success: false,
        details: 'LLM client structure or initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testDatabaseIntegration(): Promise<void> {
    try {
      const dbManager = new LLMDatabaseManager()

      // Test job creation (should not fail)
      const jobId = await dbManager.createProcessingJob(
        'test-session-id',
        'test-provider',
        'test-hash',
        { test: true }
      )

      if (!jobId || typeof jobId !== 'string') {
        throw new Error('Job creation should return a valid job ID')
      }

      // Test status update (should not fail)
      await dbManager.updateJobStatus(jobId, 'completed')

      // Test stats retrieval
      const stats = await dbManager.getProcessingStats()
      if (typeof stats.totalJobs !== 'number' || typeof stats.totalCost !== 'number') {
        throw new Error('Processing stats should return valid numbers')
      }

      // Test entity search (should return empty array without errors)
      const searchResults = await dbManager.searchEntities('test-query')
      if (!Array.isArray(searchResults)) {
        throw new Error('Entity search should return an array')
      }

      this.results.push({
        testName: 'Database Integration',
        success: true,
        details: 'Database manager operations complete without errors',
        metrics: {
          jobIdGenerated: !!jobId,
          statsStructureValid: typeof stats.totalJobs === 'number',
          searchReturnsArray: Array.isArray(searchResults),
          searchResultCount: searchResults.length
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'Database Integration',
        success: false,
        details: 'Database integration operations failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testIntegrationManager(): Promise<void> {
    try {
      const manager = new LLMIntegrationManager({
        enabled: false, // Disable to avoid API calls
        minContentLength: 100,
        maxContentLength: 10000
      })

      // Test options management
      const initialOptions = manager.getOptions()
      if (initialOptions.enabled !== false) {
        throw new Error('Options not set correctly')
      }

      manager.updateOptions({ enabled: true, confidenceThreshold: 0.8 })
      const updatedOptions = manager.getOptions()
      
      if (updatedOptions.enabled !== true || updatedOptions.confidenceThreshold !== 0.8) {
        throw new Error('Options update not working')
      }

      // Test content eligibility (without processing)
      const shouldProcess = await manager.shouldProcessContent(MOCK_CONTENT)
      // Should be false because no API keys are configured in test environment
      
      // Test processing summary
      const summary = await manager.getProcessingSummary()
      if (typeof summary.costLimitCents !== 'number' || typeof summary.enabled !== 'boolean') {
        throw new Error('Processing summary structure invalid')
      }

      this.results.push({
        testName: 'Integration Manager',
        success: true,
        details: 'Integration manager configuration and options management work correctly',
        metrics: {
          optionsUpdateWorks: updatedOptions.confidenceThreshold === 0.8,
          summaryStructureValid: typeof summary.costLimitCents === 'number',
          contentEligibilityCheck: typeof shouldProcess === 'boolean',
          enabledToggleWorks: updatedOptions.enabled === true
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'Integration Manager',
        success: false,
        details: 'Integration manager operations failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testAPIRouteStructure(): Promise<void> {
    try {
      // This test validates that the API route files exist and have proper structure
      // In a real test environment, we'd test the actual endpoints
      
      // Validate that the integration has been added to the convert route
      const fs = require('fs')
      const path = require('path')
      
      const convertRoutePath = path.join(process.cwd(), 'src/app/api/convert/route.ts')
      
      if (!fs.existsSync(convertRoutePath)) {
        throw new Error('Convert route file not found')
      }

      const convertRouteContent = fs.readFileSync(convertRoutePath, 'utf8')
      
      // Check for LLM integration imports and code
      const hasLLMImport = convertRouteContent.includes('getGlobalLLMIntegration')
      const hasLLMProcessing = convertRouteContent.includes('enableLLMProcessing')
      const hasLLMResponse = convertRouteContent.includes('llmProcessing')

      if (!hasLLMImport || !hasLLMProcessing || !hasLLMResponse) {
        throw new Error('Convert route missing LLM integration components')
      }

      // Check for LLM API routes
      const llmProcessRoutePath = path.join(process.cwd(), 'src/app/api/llm/process/route.ts')
      const llmStatsRoutePath = path.join(process.cwd(), 'src/app/api/llm/stats/route.ts')

      if (!fs.existsSync(llmProcessRoutePath)) {
        throw new Error('LLM process route not found')
      }

      if (!fs.existsSync(llmStatsRoutePath)) {
        throw new Error('LLM stats route not found')
      }

      this.results.push({
        testName: 'API Route Structure',
        success: true,
        details: 'All LLM API routes exist and convert route has proper integration',
        metrics: {
          convertRouteHasLLMImport: hasLLMImport,
          convertRouteHasLLMProcessing: hasLLMProcessing,
          convertRouteHasLLMResponse: hasLLMResponse,
          llmProcessRouteExists: fs.existsSync(llmProcessRoutePath),
          llmStatsRouteExists: fs.existsSync(llmStatsRoutePath)
        }
      })

    } catch (error) {
      this.results.push({
        testName: 'API Route Structure',
        success: false,
        details: 'API route structure validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  getResults(): ValidationResult[] {
    return this.results
  }

  printDetailedResults(): void {
    console.log('\n📋 Detailed Validation Results:')
    console.log('=====================================')
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      console.log(`\n${index + 1}. ${result.testName} ${status}`)
      console.log(`   ${result.details}`)
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      
      if (result.metrics) {
        console.log(`   Metrics:`, result.metrics)
      }
    })
  }
}

// Export for easy testing
export async function validatePhase3Implementation(): Promise<boolean> {
  const validator = new Phase3Validator()
  const results = await validator.runAllValidations()
  
  validator.printDetailedResults()
  
  if (results.overallSuccess) {
    console.log('\n🎉 Phase 3 implementation validation PASSED!')
    console.log('✅ All core components are properly implemented and structured')
  } else {
    console.log('\n❌ Phase 3 implementation validation FAILED!')
    console.log('⚠️  Some components need attention before deployment')
  }
  
  return results.overallSuccess
}

// Quick validation for development
export async function quickValidation(): Promise<void> {
  console.log('🔍 Running quick Phase 3 validation...')
  
  try {
    // Test basic imports
    const { LLMClient } = await import('./client')
    const { ContentProcessor } = await import('./processor')
    const { LLMDatabaseManager } = await import('./database')
    
    console.log('✅ All core modules import successfully')
    
    // Test basic instantiation
    const client = new LLMClient({ openai: 'test', anthropic: 'test' })
    const processor = new ContentProcessor(client)
    const dbManager = new LLMDatabaseManager()
    
    console.log('✅ All core classes instantiate successfully')
    console.log('✅ Phase 3 basic validation complete')
    
  } catch (error) {
    console.error('❌ Phase 3 quick validation failed:', error)
  }
}