/**
 * Content processing pipeline with entity extraction and relationship detection
 * Orchestrates LLM calls for comprehensive knowledge graph construction
 */

import { LLMClient } from './client'
import { 
  ENTITY_EXTRACTION_PROMPT, 
  RELATIONSHIP_DETECTION_PROMPT, 
  CONTENT_ANALYSIS_PROMPT,
  renderPrompt,
  validatePromptLength,
  preprocessContent,
  chunkContent
} from './prompts'
import { 
  ProcessingResult, 
  Entity, 
  Relationship, 
  LLMRequest,
  QUALITY_THRESHOLDS
} from './providers'

export interface ProcessingOptions {
  includeRelationships?: boolean
  includeAnalysis?: boolean
  confidenceThreshold?: number
  maxChunks?: number
  timeout?: number
}

export class ContentProcessor {
  private llmClient: LLMClient
  private processingStats = {
    totalRequests: 0,
    successfulRequests: 0,
    totalCost: 0,
    totalProcessingTime: 0
  }

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
  }

  public async processContent(
    content: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const {
      includeRelationships = true,
      includeAnalysis = true,
      confidenceThreshold = QUALITY_THRESHOLDS.entityConfidence,
      maxChunks = 5,
      timeout = QUALITY_THRESHOLDS.maxProcessingTime
    } = options

    try {
      // Preprocess content
      const cleanContent = preprocessContent(content)
      
      if (cleanContent.length < QUALITY_THRESHOLDS.minimumContent) {
        throw new Error('Content too short for meaningful processing')
      }

      // Check if content needs chunking
      const chunks = chunkContent(cleanContent, 8000) // Leave room for prompts
      const processedChunks = chunks.slice(0, maxChunks)
      
      console.log(`Processing ${processedChunks.length} content chunks...`)

      // Extract entities from all chunks
      const allEntities: Entity[] = []
      for (let i = 0; i < processedChunks.length; i++) {
        console.log(`Extracting entities from chunk ${i + 1}/${processedChunks.length}`)
        const chunkEntities = await this.extractEntities(processedChunks[i], confidenceThreshold)
        allEntities.push(...chunkEntities)
      }

      // Deduplicate entities
      const uniqueEntities = this.deduplicateEntities(allEntities)
      console.log(`Found ${uniqueEntities.length} unique entities`)

      // Extract relationships if requested
      let relationships: Relationship[] = []
      if (includeRelationships && uniqueEntities.length >= 2) {
        console.log('Detecting relationships between entities...')
        relationships = await this.detectRelationships(
          uniqueEntities, 
          cleanContent, 
          QUALITY_THRESHOLDS.relationshipConfidence
        )
        console.log(`Found ${relationships.length} relationships`)
      }

      // Generate content analysis if requested
      let summary = ''
      let keyInsights: string[] = []
      let qualityAssessment = { contentReliability: 'medium' as const }
      
      if (includeAnalysis) {
        console.log('Generating content analysis...')
        const analysis = await this.analyzeContent(cleanContent)
        summary = analysis.summary
        keyInsights = analysis.keyInsights
        qualityAssessment = analysis.quality
      }

      const processingTime = Date.now() - startTime
      this.updateStats(processingTime)

      // Calculate quality metrics
      const avgEntityConfidence = uniqueEntities.length > 0 
        ? uniqueEntities.reduce((sum, e) => sum + e.confidence, 0) / uniqueEntities.length 
        : 0
      
      const avgRelationshipConfidence = relationships.length > 0
        ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length
        : 0

      const result: ProcessingResult = {
        entities: uniqueEntities,
        relationships,
        summary,
        keyInsights,
        quality: {
          contentPreservationRatio: Math.min(uniqueEntities.length / Math.max(processedChunks.length * 2, 1), 1),
          extractionConfidence: avgEntityConfidence,
          completenessScore: Math.min((uniqueEntities.length + relationships.length) / 10, 1)
        },
        processing: {
          provider: 'multi-provider',
          processingTime,
          totalCost: this.llmClient.getTotalCost(),
          retryCount: 0
        }
      }

      console.log(`Content processing completed in ${processingTime}ms`)
      console.log(`Quality: ${(result.quality.extractionConfidence * 100).toFixed(1)}% confidence, ${result.quality.completenessScore * 100}% completeness`)
      
      return result

    } catch (error) {
      console.error('Content processing failed:', error)
      
      return {
        entities: [],
        relationships: [],
        summary: '',
        keyInsights: [],
        quality: {
          contentPreservationRatio: 0,
          extractionConfidence: 0,
          completenessScore: 0
        },
        processing: {
          provider: 'failed',
          processingTime: Date.now() - startTime,
          totalCost: 0,
          retryCount: 0
        }
      }
    }
  }

  private async extractEntities(content: string, confidenceThreshold: number): Promise<Entity[]> {
    const prompt = renderPrompt(ENTITY_EXTRACTION_PROMPT, { content })
    
    const request: LLMRequest = {
      content: prompt.user,
      taskType: 'entity_extraction',
      options: {
        systemPrompt: prompt.system,
        responseFormat: 'json',
        temperature: 0.1,
        maxTokens: 2000
      }
    }

    this.processingStats.totalRequests++
    const response = await this.llmClient.process(request)
    
    if (!response.success) {
      this.processingStats.successfulRequests++
      throw new Error(`Entity extraction failed: ${response.error?.message}`)
    }

    try {
      const result = JSON.parse(response.content)
      const entities: Entity[] = (result.entities || [])
        .filter((e: any) => e.confidence >= confidenceThreshold)
        .map((e: any, index: number) => ({
          id: `entity_${Date.now()}_${index}`,
          name: e.name,
          type: e.type,
          confidence: e.confidence,
          context: e.context || '',
          sourceSpan: e.sourceSpan,
          metadata: e.metadata || {}
        }))

      this.processingStats.successfulRequests++
      this.processingStats.totalCost += response.usage.estimatedCost
      
      return entities
    } catch (parseError) {
      console.error('Failed to parse entity extraction response:', response.content)
      return []
    }
  }

  private async detectRelationships(
    entities: Entity[], 
    content: string, 
    confidenceThreshold: number
  ): Promise<Relationship[]> {
    // Prepare entities list for prompt
    const entitiesList = entities.map(e => `- ${e.name} (${e.type})`).join('\n')
    
    const prompt = renderPrompt(RELATIONSHIP_DETECTION_PROMPT, { 
      entities: entitiesList,
      content 
    })
    
    const request: LLMRequest = {
      content: prompt.user,
      taskType: 'relationship_detection',
      options: {
        systemPrompt: prompt.system,
        responseFormat: 'json',
        temperature: 0.1,
        maxTokens: 1500
      }
    }

    this.processingStats.totalRequests++
    const response = await this.llmClient.process(request)
    
    if (!response.success) {
      console.warn('Relationship detection failed, continuing without relationships')
      return []
    }

    try {
      const result = JSON.parse(response.content)
      const relationships: Relationship[] = (result.relationships || [])
        .filter((r: any) => r.confidence >= confidenceThreshold)
        .map((r: any, index: number) => {
          // Find matching entity IDs
          const sourceEntity = entities.find(e => e.name === r.sourceEntity)
          const targetEntity = entities.find(e => e.name === r.targetEntity)
          
          if (!sourceEntity || !targetEntity) {
            return null
          }

          return {
            id: `relationship_${Date.now()}_${index}`,
            sourceEntityId: sourceEntity.id,
            targetEntityId: targetEntity.id,
            type: r.type,
            confidence: r.confidence,
            context: r.context || '',
            metadata: { bidirectional: r.bidirectional || false }
          }
        })
        .filter(Boolean)

      this.processingStats.successfulRequests++
      this.processingStats.totalCost += response.usage.estimatedCost
      
      return relationships
    } catch (parseError) {
      console.error('Failed to parse relationship detection response:', response.content)
      return []
    }
  }

  private async analyzeContent(content: string): Promise<{
    summary: string
    keyInsights: string[]
    quality: any
  }> {
    const prompt = renderPrompt(CONTENT_ANALYSIS_PROMPT, { content })
    
    const request: LLMRequest = {
      content: prompt.user,
      taskType: 'content_analysis',
      options: {
        systemPrompt: prompt.system,
        responseFormat: 'json',
        temperature: 0.2,
        maxTokens: 1000
      }
    }

    this.processingStats.totalRequests++
    const response = await this.llmClient.process(request)
    
    if (!response.success) {
      return {
        summary: 'Content analysis unavailable',
        keyInsights: [],
        quality: { contentReliability: 'unknown' }
      }
    }

    try {
      const result = JSON.parse(response.content)
      this.processingStats.successfulRequests++
      this.processingStats.totalCost += response.usage.estimatedCost
      
      return {
        summary: result.summary || '',
        keyInsights: result.keyInsights || [],
        quality: result.quality || { contentReliability: 'medium' }
      }
    } catch (parseError) {
      console.error('Failed to parse content analysis response:', response.content)
      return {
        summary: 'Analysis parsing failed',
        keyInsights: [],
        quality: { contentReliability: 'low' }
      }
    }
  }

  private deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Map<string, Entity>()
    
    for (const entity of entities) {
      const key = `${entity.name.toLowerCase()}_${entity.type}`
      const existing = seen.get(key)
      
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity)
      }
    }
    
    return Array.from(seen.values())
  }

  private updateStats(processingTime: number): void {
    this.processingStats.totalProcessingTime += processingTime
  }

  public getProcessingStats() {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalRequests > 0 
        ? this.processingStats.successfulRequests / this.processingStats.totalRequests 
        : 0,
      averageProcessingTime: this.processingStats.successfulRequests > 0
        ? this.processingStats.totalProcessingTime / this.processingStats.successfulRequests
        : 0
    }
  }
}