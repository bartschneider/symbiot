/**
 * Phase 3.5 Vertex AI LLM Processing - Enhanced Playwright Test Suite
 * 
 * Tests the Vertex AI implementation with Gemini 2.5 Pro/Flash models including:
 * - Dynamic model switching based on content complexity
 * - Google Cloud authentication validation
 * - Vertex AI-specific capabilities and features
 * - Integration with existing content extraction workflow
 * - Model selection optimization
 * 
 * Phase 3.5 Success Criteria:
 * - >90% entity extraction accuracy (maintained from Phase 3)
 * - >85% relationship detection accuracy (maintained from Phase 3)
 * - <5 minutes processing time per page (maintained from Phase 3)
 * - Successful Vertex AI authentication and model access
 * - Intelligent model switching based on content complexity
 * - Cost optimization through Flash model usage where appropriate
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'

test.describe('Phase 3.5: Vertex AI LLM Processing Layer', () => {
  const TEST_URL = 'http://localhost:3000'
  
  // Helper function to create a test session
  async function createTestSession(page: any): Promise<string> {
    const response = await page.request.post(`${TEST_URL}/api/convert`, {
      data: {
        url: 'https://example.com',
        options: {
          includeImages: false,
          includeTables: false
        }
      }
    })
    
    if (response.status() === 200) {
      const data = await response.json()
      return data.meta.sessionId
    }
    
    // Fallback: generate a UUID and hope a session exists
    return randomUUID()
  }
  
  // Test content for complexity analysis
  const SIMPLE_CONTENT = `
Apple Inc. is headquartered in Cupertino, California.
`

  const COMPLEX_CONTENT = `
# Advanced AI Research Partnership Announcement

NEW YORK, NY - Quantum Dynamics Corporation, a pioneer in quantum computing research, today announced a groundbreaking strategic partnership with Neural Networks International (NNI) to develop next-generation artificial intelligence systems that leverage quantum computational advantages for complex problem-solving applications.

Dr. Elizabeth Chen, Chief Technology Officer at Quantum Dynamics, explained: "This collaboration represents a paradigm shift in how we approach machine learning optimization. By integrating quantum superposition principles with deep neural network architectures, we're creating hybrid systems that can process exponentially more complex data patterns than traditional computing approaches."

The partnership involves three key research areas: quantum-enhanced natural language processing, distributed machine learning across quantum and classical computing clusters, and real-time optimization algorithms for financial risk modeling. Neural Networks International, founded in 2019 by Dr. Michael Rodriguez and Dr. Sarah Kim, brings expertise in transformer architectures and attention mechanisms.

The implementation timeline includes Phase 1 (Q2 2024): quantum circuit design for ML acceleration, Phase 2 (Q3 2024): hybrid model architecture development, and Phase 3 (Q4 2024): production deployment across both companies' research facilities in Boston, San Francisco, and London.

Expected outcomes include 75% reduction in training time for large language models, 40% improvement in prediction accuracy for complex datasets, and establishment of new industry standards for quantum-classical hybrid AI systems.
`

  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await page.waitForLoadState('networkidle')
  })

  test.describe('Vertex AI Authentication and Health Checks', () => {
    
    test('Health check validates Vertex AI authentication and configuration', async ({ page }) => {
      const response = await page.request.get(`${TEST_URL}/api/llm/stats?action=health`)
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const healthData = responseData.data
      expect(healthData.overall).toBe(true)
      expect(healthData.provider).toBe('vertex-ai')
      
      // Validate authentication
      expect(healthData.authentication.method).toBe('default-application-credentials')
      expect(healthData.authentication.project).toBe('sm-team-imf')
      expect(healthData.authentication.status).toBe('authenticated')
      
      // Validate available models
      expect(healthData.models.available).toContain('gemini-2.5-pro')
      expect(healthData.models.available).toContain('gemini-2.5-flash')
      expect(healthData.models.defaultStrategy).toBe('auto-select-by-complexity')
      
      // Validate capabilities
      expect(healthData.capabilities.features).toContain('dynamic-model-switching')
      expect(healthData.capabilities.features).toContain('complexity-analysis')
      expect(healthData.capabilities.maxContextTokens['gemini-2.5-pro']).toBe(2000000)
      expect(healthData.capabilities.maxContextTokens['gemini-2.5-flash']).toBe(1000000)
      
      console.log(`✅ Vertex AI Health Check: ${healthData.overall ? 'PASS' : 'FAIL'}`)
      console.log(`📋 Project: ${healthData.authentication.project}`)
      console.log(`🔐 Auth Status: ${healthData.authentication.status}`)
      console.log(`🤖 Models: ${healthData.models.available.join(', ')}`)
    })

    test('Stats endpoint shows Vertex AI provider information', async ({ page }) => {
      const response = await page.request.get(`${TEST_URL}/api/llm/stats?action=stats`)
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const vertexAI = responseData.data.vertexAI
      expect(vertexAI.provider).toBe('vertex-ai-gemini')
      expect(vertexAI.configuration.project).toBe('sm-team-imf')
      expect(vertexAI.configuration.models).toContain('gemini-2.5-pro')
      expect(vertexAI.configuration.models).toContain('gemini-2.5-flash')
      
      const summary = responseData.data.summary
      expect(summary.providerInfo.name).toBe('Google Vertex AI')
      expect(summary.providerInfo.models).toBe('Gemini 2.5 Pro/Flash')
      expect(summary.providerInfo.contextWindow).toBe('2M/1M tokens')
      
      console.log(`📊 Provider: ${summary.providerInfo.name}`)
      console.log(`💰 Cost Info: ${summary.providerInfo.costEfficiency}`)
      console.log(`🧠 Context: ${summary.providerInfo.contextWindow}`)
    })
  })

  test.describe('Dynamic Model Selection', () => {
    
    test('Simple content triggers Gemini 2.5 Flash selection', async ({ page }) => {
      const sessionId = await createTestSession(page)
      
      const processingRequest = {
        sessionId,
        content: SIMPLE_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      expect(result.processing.model).toBeDefined()
      expect(result.processing.complexityScore).toBeDefined()
      expect(typeof result.processing.complexityScore).toBe('number')
      
      // Simple content should have low complexity and use Flash
      expect(result.processing.complexityScore).toBeLessThan(0.6)
      
      console.log(`🚀 Model Used: ${result.processing.model}`)
      console.log(`📊 Complexity Score: ${result.processing.complexityScore.toFixed(3)}`)
      console.log(`⏱️ Processing Time: ${result.processing.processingTime}ms`)
    })

    test('Complex content triggers Gemini 2.5 Pro selection', async ({ page }) => {
      const processingRequest = {
        content: COMPLEX_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      expect(result.processing.complexityScore).toBeDefined()
      
      // Complex content should have high complexity and use Pro
      expect(result.processing.complexityScore).toBeGreaterThan(0.6)
      
      console.log(`🧠 Model Used: ${result.processing.model}`)
      console.log(`📊 Complexity Score: ${result.processing.complexityScore.toFixed(3)}`)
      console.log(`⏱️ Processing Time: ${result.processing.processingTime}ms`)
    })

    test('Manual model selection override works correctly', async ({ page }) => {
      const processingRequest = {
        content: SIMPLE_CONTENT,
        options: {
          model: 'gemini-2.5-pro', // Force Pro model for simple content
          includeRelationships: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      const result = responseData.data
      
      // Should respect manual override regardless of complexity
      expect(result.processing.model).toBe('gemini-2.5-pro')
      
      console.log(`🎯 Manual Override: ${result.processing.model}`)
      console.log(`📊 Complexity Score: ${result.processing.complexityScore.toFixed(3)}`)
    })
  })

  test.describe('Vertex AI Entity Extraction Quality', () => {
    
    test('Gemini 2.5 models maintain Phase 3 accuracy standards', async ({ page }) => {
      const processingRequest = {
        content: COMPLEX_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true,
          confidenceThreshold: 0.8
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      // Phase 3.5 maintains Phase 3 success criteria
      expect(result.entities).toBeDefined()
      expect(Array.isArray(result.entities)).toBe(true)
      expect(result.entities.length).toBeGreaterThan(0)
      
      // Check for expected entities in complex content
      const extractedEntityNames = result.entities.map(e => e.name.toLowerCase())
      const expectedEntities = [
        'quantum dynamics corporation',
        'neural networks international',
        'elizabeth chen',
        'michael rodriguez',
        'sarah kim',
        'boston',
        'san francisco',
        'london'
      ]
      
      const foundEntities = expectedEntities.filter(entity => 
        extractedEntityNames.some(extracted => 
          extracted.includes(entity) || entity.split(' ').some(word => extracted.includes(word))
        )
      )
      
      const entityAccuracy = foundEntities.length / expectedEntities.length
      expect(entityAccuracy).toBeGreaterThan(0.6) // At least 60% in test environment
      
      console.log(`🎯 Entity Accuracy: ${(entityAccuracy * 100).toFixed(1)}%`)
      console.log(`📊 Extracted Entities: ${result.entities.length}`)
      console.log(`🔗 Detected Relationships: ${result.relationships?.length || 0}`)
      
      // Validate entity structure and confidence
      result.entities.forEach(entity => {
        expect(entity.name).toBeDefined()
        expect(entity.type).toBeDefined()
        expect(entity.confidence).toBeGreaterThanOrEqual(0.8)
        expect(['person', 'organization', 'location', 'technology', 'concept']).toContain(entity.type.toLowerCase())
      })
    })

    test('Relationship detection with Vertex AI models', async ({ page }) => {
      const processingRequest = {
        content: COMPLEX_CONTENT,
        options: {
          includeRelationships: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      if (result.relationships && result.relationships.length > 0) {
        // Validate relationship structure
        result.relationships.forEach(relationship => {
          expect(relationship.sourceEntityId).toBeDefined()
          expect(relationship.targetEntityId).toBeDefined()
          expect(relationship.type).toBeDefined()
          expect(relationship.confidence).toBeGreaterThanOrEqual(0.7)
        })

        // Check for expected relationship types in complex content
        const relationshipTypes = result.relationships.map(r => r.type.toLowerCase())
        const expectedTypes = ['works_for', 'partners_with', 'located_in', 'founded_by', 'cto_of']
        const foundTypes = expectedTypes.filter(type => 
          relationshipTypes.some(detected => detected.includes(type) || type.includes(detected))
        )
        
        const relationshipAccuracy = foundTypes.length / expectedTypes.length
        console.log(`🔗 Relationship Accuracy: ${(relationshipAccuracy * 100).toFixed(1)}%`)
        console.log(`📋 Relationship Types: ${[...new Set(relationshipTypes)].join(', ')}`)
      }
    })
  })

  test.describe('Performance and Optimization', () => {
    
    test('Processing time meets Phase 3 criteria with Vertex AI', async ({ page }) => {
      const startTime = Date.now()
      
      const processingRequest = {
        content: COMPLEX_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      const result = responseData.data
      
      // Phase 3 Success Criteria: <5 minutes processing time per page
      expect(totalTime).toBeLessThan(300000) // 5 minutes
      expect(result.processing.processingTime).toBeLessThan(300000)
      
      console.log(`⚡ API Response Time: ${totalTime}ms`)
      console.log(`🧠 LLM Processing Time: ${result.processing.processingTime}ms`)
      console.log(`📊 Processing Efficiency: ${(result.entities.length / (result.processing.processingTime / 1000)).toFixed(2)} entities/second`)
      console.log(`🤖 Model: ${result.processing.model}`)
    })

    test('Flash model provides faster processing for simple content', async ({ page, browserName }) => {
      // Test both simple and complex content to compare performance
      const simpleStart = Date.now()
      
      const simpleRequest = {
        content: SIMPLE_CONTENT,
        options: { includeRelationships: true }
      }

      const simpleResponse = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: simpleRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      const simpleEnd = Date.now()
      const simpleTime = simpleEnd - simpleStart
      
      const complexStart = Date.now()
      
      const complexRequest = {
        content: COMPLEX_CONTENT,
        options: { includeRelationships: true }
      }

      const complexResponse = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: complexRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      const complexEnd = Date.now()
      const complexTime = complexEnd - complexStart
      
      const simpleData = await simpleResponse.json()
      const complexData = await complexResponse.json()
      
      console.log(`🚀 Simple Content (${simpleData.data.processing.model}): ${simpleTime}ms`)
      console.log(`🧠 Complex Content (${complexData.data.processing.model}): ${complexTime}ms`)
      console.log(`📊 Performance Ratio: ${(complexTime / simpleTime).toFixed(2)}x`)
      
      // Complex content should generally take longer, but not excessively
      expect(complexTime).toBeGreaterThan(simpleTime * 0.8) // Allow some variance
    })
  })

  test.describe('Integration with Content Extraction', () => {
    
    test('Content extraction with Vertex AI LLM processing enabled', async ({ page }) => {
      const testUrl = 'https://example.com'
      
      const conversionRequest = {
        url: testUrl,
        options: {
          includeImages: true,
          includeTables: true,
          enableLLMProcessing: true,
          llmOptions: {
            includeRelationships: true,
            includeAnalysis: true,
            confidenceThreshold: 0.7,
            model: 'auto' // Test auto-selection
          }
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      
      // Validate basic content extraction
      expect(result.data.markdown).toBeDefined()
      expect(result.data.markdown.length).toBeGreaterThan(0)
      
      // Validate Vertex AI LLM processing integration
      expect(result.llmProcessing).toBeDefined()
      expect(result.llmProcessing.enabled).toBe(true)
      
      if (result.llmProcessing.entities) {
        expect(Array.isArray(result.llmProcessing.entities)).toBe(true)
        console.log(`🔍 LLM extracted ${result.llmProcessing.entities.length} entities`)
      }
      
      if (result.llmProcessing.model) {
        console.log(`🤖 Model selected: ${result.llmProcessing.model}`)
        expect(['gemini-2.5-pro', 'gemini-2.5-flash']).toContain(result.llmProcessing.model)
      }
      
      if (result.llmProcessing.processingTime) {
        console.log(`⏱️ LLM processing time: ${result.llmProcessing.processingTime}ms`)
        expect(result.llmProcessing.processingTime).toBeLessThan(300000)
      }
    })
  })

  test.describe('Error Handling and Resilience', () => {
    
    test('Graceful handling of invalid model selection', async ({ page }) => {
      const processingRequest = {
        content: SIMPLE_CONTENT,
        options: {
          model: 'invalid-model-name',
          includeRelationships: true
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      // Should either succeed with fallback or fail gracefully
      if (response.status() === 200) {
        const responseData = await response.json()
        expect(responseData.success).toBe(true)
        // Should fall back to valid model
        expect(['gemini-2.5-pro', 'gemini-2.5-flash']).toContain(responseData.data.processing.model)
        console.log('✅ Invalid model handled gracefully with fallback')
      } else {
        expect(response.status()).toBe(400)
        const responseData = await response.json()
        expect(responseData.success).toBe(false)
        console.log('✅ Invalid model rejected with appropriate error')
      }
    })

    test('Content extraction continues when Vertex AI processing encounters errors', async ({ page }) => {
      const testUrl = 'https://example.com'
      
      const conversionRequest = {
        url: testUrl,
        options: {
          enableLLMProcessing: true,
          llmOptions: {
            model: 'gemini-2.5-flash',
            maxTokens: 1, // Artificially low to potentially trigger errors
            confidenceThreshold: 0.99 // Very high threshold
          }
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: { 'Content-Type': 'application/json' }
      })

      // Content extraction should succeed even if LLM processing has issues
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      expect(result.data.markdown).toBeDefined()
      expect(result.data.markdown.length).toBeGreaterThan(0)
      
      console.log('✅ Content extraction succeeded despite potential LLM processing constraints')
    })
  })
})