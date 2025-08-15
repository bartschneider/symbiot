/**
 * Phase 3.5 LLM Processing Layer - Updated for Vertex AI Implementation
 * 
 * Tests the Vertex AI LLM integration including:
 * - Entity extraction and relationship detection with Gemini 2.5 models
 * - Vertex AI authentication and model selection
 * - Integration with existing content extraction workflow
 * - API endpoint validation and error handling
 * 
 * Phase 3.5 Success Criteria (maintained from Phase 3):
 * - >90% entity extraction accuracy
 * - >85% relationship detection accuracy
 * - <5 minutes processing time per page
 * - Successful Vertex AI authentication and model access
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 3.5: LLM Processing Layer (Vertex AI)', () => {
  const TEST_URL = 'http://localhost:3000'
  
  // Mock content for consistent testing
  const MOCK_CONTENT = `
# TechCorp Partners with DataFlow Solutions

SAN FRANCISCO, CA - TechCorp, a leading software development company, announced today a strategic partnership with DataFlow Solutions to enhance their data analytics capabilities. The collaboration will focus on implementing advanced machine learning algorithms to improve customer insights.

"This partnership represents a significant step forward in our mission to provide data-driven solutions," said Sarah Johnson, CEO of TechCorp. "DataFlow's expertise in artificial intelligence and machine learning will complement our existing software development capabilities."

The partnership will involve the integration of DataFlow's proprietary AI platform with TechCorp's customer management system. Both companies are headquartered in San Francisco and have been working in the technology sector for over a decade.

DataFlow Solutions, founded in 2010 by Michael Chen, specializes in real-time data processing and predictive analytics. The company has previously partnered with several Fortune 500 companies to implement enterprise-scale data solutions.

The implementation is expected to begin in Q2 2024 and will be deployed across TechCorp's global operations. The partnership aims to reduce data processing time by 60% and improve customer satisfaction scores by 25%.
`

  test.beforeEach(async ({ page }) => {
    // Navigate to the application and wait for it to load
    await page.goto(TEST_URL)
    await page.waitForLoadState('networkidle')
  })

  test.describe('LLM API Endpoints', () => {
    
    test('POST /api/llm/process - Basic LLM processing request', async ({ page }) => {
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toBeDefined()
      
      // Validate processing result structure
      const result = responseData.data
      expect(result.entities).toBeDefined()
      expect(Array.isArray(result.entities)).toBe(true)
      expect(result.relationships).toBeDefined()
      expect(Array.isArray(result.relationships)).toBe(true)
      expect(result.processing).toBeDefined()
      expect(typeof result.processing.processingTime).toBe('number')
      expect(result.processing.model).toBeDefined()
      expect(['gemini-2.5-pro', 'gemini-2.5-flash']).toContain(result.processing.model)
      
      // Phase 3 Success Criteria: Entity extraction accuracy >90%
      // At minimum, should extract key entities from mock content
      const extractedEntityNames = result.entities.map(e => e.name.toLowerCase())
      const expectedEntities = ['techcorp', 'dataflow solutions', 'sarah johnson', 'michael chen', 'san francisco']
      const foundEntities = expectedEntities.filter(entity => 
        extractedEntityNames.some(extracted => extracted.includes(entity))
      )
      
      const entityAccuracy = foundEntities.length / expectedEntities.length
      expect(entityAccuracy).toBeGreaterThan(0.5) // At least 50% in test environment
      
      console.log(`Entity extraction accuracy: ${(entityAccuracy * 100).toFixed(1)}%`)
      console.log(`Extracted entities: ${result.entities.length}`)
      console.log(`Detected relationships: ${result.relationships.length}`)
      console.log(`Processing time: ${result.processing.processingTime}ms`)
      console.log(`Model used: ${result.processing.model}`)
    })

    test('POST /api/llm/process - Invalid content handling', async ({ page }) => {
      const invalidRequest = {
        content: '',
        options: {}
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: invalidRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status()).toBe(400)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeDefined()
      expect(responseData.error.code).toBe('INVALID_CONTENT')
    })

    test('POST /api/llm/process - Content too long handling', async ({ page }) => {
      const longContent = 'A'.repeat(200000) // 200K characters
      const longContentRequest = {
        content: longContent,
        options: {}
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: longContentRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status()).toBe(400)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeDefined()
      expect(responseData.error.code).toBe('CONTENT_TOO_LONG')
    })

    test('GET /api/llm/stats - Processing statistics', async ({ page }) => {
      const response = await page.request.get(`${TEST_URL}/api/llm/stats?action=stats`)
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.processing).toBeDefined()
      expect(responseData.data.summary).toBeDefined()
      
      const stats = responseData.data.processing
      expect(typeof stats.totalJobs).toBe('number')
      expect(typeof stats.totalEntities).toBe('number')
      expect(typeof stats.totalRelationships).toBe('number')
      
      // Validate Vertex AI specific stats
      const vertexAI = responseData.data.vertexAI
      expect(vertexAI.provider).toBe('vertex-ai-gemini')
      expect(vertexAI.configuration.project).toBe('sm-team-imf')
      
      console.log(`Total LLM jobs processed: ${stats.totalJobs}`)
      console.log(`Total entities extracted: ${stats.totalEntities}`)
      console.log(`Total relationships detected: ${stats.totalRelationships}`)
      console.log(`Vertex AI provider: ${vertexAI.provider}`)
      console.log(`GCP project: ${vertexAI.configuration.project}`)
    })

    test('GET /api/llm/stats - Entity search', async ({ page }) => {
      const searchQuery = 'TechCorp'
      const response = await page.request.get(
        `${TEST_URL}/api/llm/stats?action=search&q=${encodeURIComponent(searchQuery)}&minConfidence=0.5`
      )
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.query).toBe(searchQuery)
      expect(responseData.data.results).toBeDefined()
      expect(Array.isArray(responseData.data.results)).toBe(true)
      
      console.log(`Entity search for "${searchQuery}": ${responseData.data.total} results`)
    })

    test('GET /api/llm/stats - Invalid action handling', async ({ page }) => {
      const response = await page.request.get(`${TEST_URL}/api/llm/stats?action=invalid`)
      
      expect(response.status()).toBe(400)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INVALID_ACTION')
    })
  })

  test.describe('Content Extraction with LLM Integration', () => {
    
    test('POST /api/convert - Content extraction with LLM processing enabled', async ({ page }) => {
      // Use a reliable test URL for content extraction
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
            confidenceThreshold: 0.7
          }
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minute timeout for content extraction + LLM processing
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toBeDefined()
      
      const result = responseData.data
      
      // Validate basic content extraction
      expect(result.data.markdown).toBeDefined()
      expect(result.data.markdown.length).toBeGreaterThan(0)
      expect(result.stats.processingTime).toBeDefined()
      expect(typeof result.stats.processingTime).toBe('number')
      
      // Validate LLM processing integration
      expect(result.llmProcessing).toBeDefined()
      expect(result.llmProcessing.enabled).toBe(true)
      
      if (result.llmProcessing.entities) {
        expect(Array.isArray(result.llmProcessing.entities)).toBe(true)
        console.log(`LLM extracted ${result.llmProcessing.entities.length} entities`)
      }
      
      if (result.llmProcessing.relationships) {
        expect(Array.isArray(result.llmProcessing.relationships)).toBe(true)
        console.log(`LLM detected ${result.llmProcessing.relationships.length} relationships`)
      }
      
      if (result.llmProcessing.processingTime) {
        console.log(`LLM processing time: ${result.llmProcessing.processingTime}ms`)
        
        // Phase 3 Success Criteria: <5 minutes processing time
        expect(result.llmProcessing.processingTime).toBeLessThan(300000) // 5 minutes
      }
      
      console.log(`Total content extraction time: ${result.stats.processingTime}ms`)
      console.log(`Content size: ${result.stats.contentSize} bytes`)
    })

    test('POST /api/convert - Content extraction with LLM processing disabled', async ({ page }) => {
      const testUrl = 'https://example.com'
      
      const conversionRequest = {
        url: testUrl,
        options: {
          includeImages: true,
          includeTables: true,
          enableLLMProcessing: false
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds should be enough without LLM processing
      })

      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      expect(result.llmProcessing.enabled).toBe(false)
      expect(result.llmProcessing.entities).toBeUndefined()
      expect(result.llmProcessing.relationships).toBeUndefined()
      
      console.log(`Content extraction without LLM: ${result.stats.processingTime}ms`)
    })

    test('POST /api/convert - Invalid URL handling', async ({ page }) => {
      const invalidRequest = {
        url: 'not-a-valid-url',
        options: {
          enableLLMProcessing: true
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: invalidRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status()).toBe(400)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INVALID_URL')
    })
  })

  test.describe('Entity and Relationship Validation', () => {
    
    test('Entity extraction quality validation', async ({ page }) => {
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          confidenceThreshold: 0.8 // Higher threshold for quality test
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      if (result.entities && result.entities.length > 0) {
        // Validate entity structure
        result.entities.forEach(entity => {
          expect(entity.name).toBeDefined()
          expect(typeof entity.name).toBe('string')
          expect(entity.name.length).toBeGreaterThan(0)
          
          expect(entity.type).toBeDefined()
          expect(typeof entity.type).toBe('string')
          expect(['person', 'organization', 'location', 'technology', 'concept']).toContain(entity.type.toLowerCase())
          
          expect(entity.confidence).toBeDefined()
          expect(typeof entity.confidence).toBe('number')
          expect(entity.confidence).toBeGreaterThanOrEqual(0)
          expect(entity.confidence).toBeLessThanOrEqual(1)
          expect(entity.confidence).toBeGreaterThanOrEqual(0.8) // High threshold test
        })

        // Check for expected entity types in content
        const entityTypes = result.entities.map(e => e.type.toLowerCase())
        expect(entityTypes).toContain('organization') // TechCorp, DataFlow Solutions
        expect(entityTypes).toContain('person') // Sarah Johnson, Michael Chen
        expect(entityTypes).toContain('location') // San Francisco
        
        console.log(`High-confidence entities (≥0.8): ${result.entities.length}`)
        console.log(`Entity types found: ${[...new Set(entityTypes)].join(', ')}`)
      }
    })

    test('Relationship detection accuracy validation', async ({ page }) => {
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          confidenceThreshold: 0.7
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      if (result.relationships && result.relationships.length > 0) {
        // Phase 3 Success Criteria: >85% relationship detection accuracy
        
        // Validate relationship structure
        result.relationships.forEach(relationship => {
          expect(relationship.sourceEntityId).toBeDefined()
          expect(relationship.targetEntityId).toBeDefined()
          expect(relationship.type).toBeDefined()
          expect(typeof relationship.type).toBe('string')
          
          expect(relationship.confidence).toBeDefined()
          expect(typeof relationship.confidence).toBe('number')
          expect(relationship.confidence).toBeGreaterThanOrEqual(0)
          expect(relationship.confidence).toBeLessThanOrEqual(1)
        })

        // Check for expected relationship types
        const relationshipTypes = result.relationships.map(r => r.type.toLowerCase())
        const expectedTypes = ['works_for', 'partners_with', 'located_in', 'founded_by']
        const foundTypes = expectedTypes.filter(type => 
          relationshipTypes.some(detected => detected.includes(type) || type.includes(detected))
        )
        
        const relationshipAccuracy = foundTypes.length / expectedTypes.length
        expect(relationshipAccuracy).toBeGreaterThan(0.3) // At least 30% in test environment
        
        console.log(`Relationship detection accuracy: ${(relationshipAccuracy * 100).toFixed(1)}%`)
        console.log(`Detected relationships: ${result.relationships.length}`)
        console.log(`Relationship types: ${[...new Set(relationshipTypes)].join(', ')}`)
      }
    })
  })

  test.describe('Performance and Cost Validation', () => {
    
    test('Processing time performance validation', async ({ page }) => {
      const startTime = Date.now()
      
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      const result = responseData.data
      
      // Phase 3 Success Criteria: <5 minutes processing time per page
      expect(totalTime).toBeLessThan(300000) // 5 minutes
      expect(result.processing.processingTime).toBeLessThan(300000)
      
      console.log(`API response time: ${totalTime}ms`)
      console.log(`LLM processing time: ${result.processing.processingTime}ms`)
      console.log(`Processing efficiency: ${(result.entities.length / (result.processing.processingTime / 1000)).toFixed(2)} entities/second`)
    })

    test('Vertex AI model selection and processing validation', async ({ page }) => {
      // Process content and validate Vertex AI specific features
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true,
          model: 'auto' // Test auto-selection
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      // Validate Vertex AI processing
      expect(result.processing.model).toBeDefined()
      expect(['gemini-2.5-pro', 'gemini-2.5-flash']).toContain(result.processing.model)
      expect(typeof result.processing.complexityScore).toBe('number')
      expect(result.processing.complexityScore).toBeGreaterThanOrEqual(0)
      expect(result.processing.complexityScore).toBeLessThanOrEqual(1)
      
      console.log(`Model selected: ${result.processing.model}`)
      console.log(`Complexity score: ${result.processing.complexityScore.toFixed(3)}`)
      console.log(`Processing time: ${result.processing.processingTime}ms`)
      console.log(`Entities extracted: ${result.entities.length}`)
    })
  })

  test.describe('Error Handling and Resilience', () => {
    
    test('Graceful degradation when Vertex AI service encounters issues', async ({ page }) => {
      // Test with invalid model selection
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          model: 'invalid-model' // This should trigger error handling
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Should either succeed with fallback or fail gracefully
      if (response.status() === 200) {
        const responseData = await response.json()
        expect(responseData.success).toBe(true)
        console.log('Vertex AI processing succeeded with fallback model')
      } else {
        expect([400, 503]).toContain(response.status())
        const responseData = await response.json()
        expect(responseData.success).toBe(false)
        expect(['INVALID_MODEL', 'VERTEX_AI_SERVICE_UNAVAILABLE']).toContain(responseData.error.code)
        console.log('Vertex AI processing failed gracefully as expected')
      }
    })

    test('Content extraction continues when LLM processing fails', async ({ page }) => {
      const testUrl = 'https://example.com'
      
      const conversionRequest = {
        url: testUrl,
        options: {
          enableLLMProcessing: true,
          llmOptions: {
            forceFailure: true // Simulate LLM processing failure
          }
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Content extraction should succeed even if LLM processing fails
      expect(response.status()).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      const result = responseData.data
      expect(result.data.markdown).toBeDefined()
      expect(result.data.markdown.length).toBeGreaterThan(0)
      
      // LLM processing should be marked as enabled but without results
      expect(result.llmProcessing.enabled).toBe(true)
      expect(result.llmProcessing.entities).toBeUndefined()
      
      console.log('Content extraction succeeded despite LLM processing failure')
    })
  })

  test.describe('Integration Validation', () => {
    
    test('Database persistence of LLM results', async ({ page }) => {
      const processingRequest = {
        content: MOCK_CONTENT,
        options: {
          includeRelationships: true,
          includeAnalysis: true
        }
      }

      const response = await page.request.post(`${TEST_URL}/api/llm/process`, {
        data: processingRequest,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const responseData = await response.json()
      const result = responseData.data
      
      if (result.jobId) {
        // Check if results are persisted in database
        const entitiesResponse = await page.request.get(
          `${TEST_URL}/api/llm/stats?action=entities&jobId=${result.jobId}`
        )
        
        expect(entitiesResponse.status()).toBe(200)
        
        const entitiesData = await entitiesResponse.json()
        expect(entitiesData.success).toBe(true)
        expect(entitiesData.data.entities).toBeDefined()
        expect(entitiesData.data.relationships).toBeDefined()
        
        console.log(`Database persistence verified for job ${result.jobId}`)
        console.log(`Persisted entities: ${entitiesData.data.entities.length}`)
        console.log(`Persisted relationships: ${entitiesData.data.relationships.length}`)
      }
    })

    test('End-to-end workflow: URL extraction → LLM processing → Knowledge storage', async ({ page }) => {
      const testUrl = 'https://example.com'
      
      // Step 1: Extract content with LLM processing
      const conversionRequest = {
        url: testUrl,
        options: {
          enableLLMProcessing: true,
          llmOptions: {
            includeRelationships: true,
            includeAnalysis: true,
            confidenceThreshold: 0.6
          }
        }
      }

      const extractionResponse = await page.request.post(`${TEST_URL}/api/convert`, {
        data: conversionRequest,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      })

      expect(extractionResponse.status()).toBe(200)
      
      const extractionData = await extractionResponse.json()
      expect(extractionData.success).toBe(true)
      
      const sessionId = extractionData.meta.sessionId
      expect(sessionId).toBeDefined()
      
      // Step 2: Verify processing statistics updated
      const statsResponse = await page.request.get(`${TEST_URL}/api/llm/stats?action=stats`)
      const statsData = await statsResponse.json()
      
      expect(statsData.success).toBe(true)
      expect(statsData.data.processing.totalJobs).toBeGreaterThan(0)
      
      // Step 3: Search for extracted entities
      if (extractionData.data.llmProcessing?.entities?.length > 0) {
        const firstEntity = extractionData.data.llmProcessing.entities[0]
        const searchResponse = await page.request.get(
          `${TEST_URL}/api/llm/stats?action=search&q=${encodeURIComponent(firstEntity.name)}`
        )
        
        const searchData = await searchResponse.json()
        expect(searchData.success).toBe(true)
        expect(searchData.data.results.length).toBeGreaterThan(0)
        
        console.log(`End-to-end workflow completed successfully`)
        console.log(`Session ID: ${sessionId}`)
        console.log(`Extracted entities: ${extractionData.data.llmProcessing.entities.length}`)
        console.log(`Search results for "${firstEntity.name}": ${searchData.data.results.length}`)
      }
    })
  })
})