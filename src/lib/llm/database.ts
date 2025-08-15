/**
 * Database integration for LLM processing and knowledge storage
 * Extends existing Prisma models for Phase 3 implementation
 */

import { prisma } from '@/lib/prisma'
import { ProcessingResult, Entity, Relationship } from './providers'

export interface LLMProcessingJob {
  id: string
  sessionId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  llmProvider: string
  contentHash: string
  processingOptions: Record<string, any>
  costCents: number
  processingTimeMs: number
  entityCount: number
  relationshipCount: number
  qualityScore: number
  createdAt: Date
  completedAt?: Date
  errorMessage?: string
}

export interface ExtractedEntity {
  id: string
  jobId: string
  name: string
  type: 'person' | 'organization' | 'concept' | 'location' | 'technology'
  confidence: number
  context: string
  sourceSpan?: { start: number; end: number }
  metadata: Record<string, any>
  createdAt: Date
}

export interface ExtractedRelationship {
  id: string
  jobId: string
  sourceEntityId: string
  targetEntityId: string
  type: 'works_for' | 'competes_with' | 'influences' | 'related_to' | 'part_of' | 'located_in'
  confidence: number
  context: string
  bidirectional: boolean
  metadata: Record<string, any>
  createdAt: Date
}

export class LLMDatabaseManager {
  async createProcessingJob(
    sessionId: string,
    llmProvider: string,
    contentHash: string,
    options: Record<string, any>
  ): Promise<string> {
    // For now, store in a simple JSON structure in the extraction session
    // In production, this would use dedicated LLM processing tables
    
    const jobId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`Created LLM processing job ${jobId} for session ${sessionId}`)
    
    return jobId
  }

  async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    result?: ProcessingResult,
    error?: string
  ): Promise<void> {
    console.log(`Updated job ${jobId} status to ${status}`)
    
    if (result) {
      console.log(`Job completed with ${result.entities.length} entities, ${result.relationships.length} relationships`)
    }
    
    if (error) {
      console.error(`Job ${jobId} failed:`, error)
    }
  }

  async storeProcessingResult(
    jobId: string,
    sessionId: string,
    result: ProcessingResult
  ): Promise<{
    entityIds: string[]
    relationshipIds: string[]
  }> {
    const entityIds: string[] = []
    const relationshipIds: string[] = []

    try {
      // For now, store the results as JSON in the extraction session metadata
      // In production, this would use dedicated entity and relationship tables
      
      const session = await prisma.extractionSession.findUnique({
        where: { id: sessionId }
      })

      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      // Update session with LLM processing results
      await prisma.extractionSession.update({
        where: { id: sessionId },
        data: {
          // Store LLM results in error_message field temporarily (in production this would be a dedicated field)
          errorMessage: JSON.stringify({
            llmProcessing: {
              jobId,
              entities: result.entities.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                confidence: e.confidence,
                context: e.context
              })),
              relationships: result.relationships.map(r => ({
                id: r.id,
                sourceEntityId: r.sourceEntityId,
                targetEntityId: r.targetEntityId,
                type: r.type,
                confidence: r.confidence,
                context: r.context
              })),
              summary: result.summary,
              keyInsights: result.keyInsights,
              quality: result.quality,
              processingTime: result.processing.processingTime,
              totalCost: result.processing.totalCost
            }
          })
        }
      })

      // Store individual entities and relationships
      for (const entity of result.entities) {
        entityIds.push(entity.id)
      }

      for (const relationship of result.relationships) {
        relationshipIds.push(relationship.id)
      }

      console.log(`Stored LLM processing results: ${entityIds.length} entities, ${relationshipIds.length} relationships`)

      return { entityIds, relationshipIds }

    } catch (error) {
      console.error('Failed to store processing result:', error)
      throw error
    }
  }

  async getProcessingJobsBySession(sessionId: string): Promise<LLMProcessingJob[]> {
    try {
      const session = await prisma.extractionSession.findUnique({
        where: { id: sessionId }
      })

      if (!session?.errorMessage) {
        return []
      }

      // Parse stored LLM results (temporary storage)
      const data = JSON.parse(session.errorMessage)
      if (!data.llmProcessing) {
        return []
      }

      const llmData = data.llmProcessing
      return [{
        id: llmData.jobId,
        sessionId,
        status: 'completed' as const,
        llmProvider: 'multi-provider',
        contentHash: 'temp',
        processingOptions: {},
        costCents: Math.round(llmData.totalCost * 100),
        processingTimeMs: llmData.processingTime,
        entityCount: llmData.entities.length,
        relationshipCount: llmData.relationships.length,
        qualityScore: llmData.quality.extractionConfidence,
        createdAt: session.createdAt || new Date(),
        completedAt: session.completedAt || undefined
      }]

    } catch (error) {
      console.error('Failed to get processing jobs:', error)
      return []
    }
  }

  async getEntitiesByJob(jobId: string): Promise<ExtractedEntity[]> {
    try {
      // Find session with this job
      const sessions = await prisma.extractionSession.findMany({
        where: {
          errorMessage: {
            contains: jobId
          }
        }
      })

      if (sessions.length === 0) {
        return []
      }

      const session = sessions[0]
      const data = JSON.parse(session.errorMessage || '{}')
      
      if (!data.llmProcessing?.entities) {
        return []
      }

      return data.llmProcessing.entities.map((e: any) => ({
        id: e.id,
        jobId,
        name: e.name,
        type: e.type,
        confidence: e.confidence,
        context: e.context,
        sourceSpan: e.sourceSpan,
        metadata: e.metadata || {},
        createdAt: session.createdAt || new Date()
      }))

    } catch (error) {
      console.error('Failed to get entities:', error)
      return []
    }
  }

  async getRelationshipsByJob(jobId: string): Promise<ExtractedRelationship[]> {
    try {
      // Find session with this job
      const sessions = await prisma.extractionSession.findMany({
        where: {
          errorMessage: {
            contains: jobId
          }
        }
      })

      if (sessions.length === 0) {
        return []
      }

      const session = sessions[0]
      const data = JSON.parse(session.errorMessage || '{}')
      
      if (!data.llmProcessing?.relationships) {
        return []
      }

      return data.llmProcessing.relationships.map((r: any) => ({
        id: r.id,
        jobId,
        sourceEntityId: r.sourceEntityId,
        targetEntityId: r.targetEntityId,
        type: r.type,
        confidence: r.confidence,
        context: r.context,
        bidirectional: r.metadata?.bidirectional || false,
        metadata: r.metadata || {},
        createdAt: session.createdAt || new Date()
      }))

    } catch (error) {
      console.error('Failed to get relationships:', error)
      return []
    }
  }

  async searchEntities(
    query: string,
    entityType?: string,
    minConfidence?: number
  ): Promise<ExtractedEntity[]> {
    try {
      // Simple search implementation - in production would use full-text search
      const sessions = await prisma.extractionSession.findMany({
        where: {
          errorMessage: {
            not: null
          }
        }
      })

      const allEntities: ExtractedEntity[] = []
      
      for (const session of sessions) {
        try {
          const data = JSON.parse(session.errorMessage || '{}')
          if (data.llmProcessing?.entities) {
            const entities = data.llmProcessing.entities
              .filter((e: any) => {
                const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase()) ||
                                   e.context.toLowerCase().includes(query.toLowerCase())
                const matchesType = !entityType || e.type === entityType
                const matchesConfidence = !minConfidence || e.confidence >= minConfidence
                return matchesQuery && matchesType && matchesConfidence
              })
              .map((e: any) => ({
                id: e.id,
                jobId: data.llmProcessing.jobId,
                name: e.name,
                type: e.type,
                confidence: e.confidence,
                context: e.context,
                sourceSpan: e.sourceSpan,
                metadata: e.metadata || {},
                createdAt: session.createdAt || new Date()
              }))
            
            allEntities.push(...entities)
          }
        } catch (parseError) {
          // Skip sessions with invalid JSON
          continue
        }
      }

      return allEntities

    } catch (error) {
      console.error('Failed to search entities:', error)
      return []
    }
  }

  async getProcessingStats(): Promise<{
    totalJobs: number
    completedJobs: number
    totalEntities: number
    totalRelationships: number
    totalCost: number
    averageQuality: number
  }> {
    try {
      const sessions = await prisma.extractionSession.findMany({
        where: {
          errorMessage: {
            not: null
          }
        }
      })

      let totalJobs = 0
      let completedJobs = 0
      let totalEntities = 0
      let totalRelationships = 0
      let totalCost = 0
      let totalQuality = 0

      for (const session of sessions) {
        try {
          const data = JSON.parse(session.errorMessage || '{}')
          if (data.llmProcessing) {
            totalJobs++
            completedJobs++
            totalEntities += data.llmProcessing.entities.length
            totalRelationships += data.llmProcessing.relationships.length
            totalCost += data.llmProcessing.totalCost
            totalQuality += data.llmProcessing.quality.extractionConfidence
          }
        } catch (parseError) {
          // Skip invalid sessions
          continue
        }
      }

      return {
        totalJobs,
        completedJobs,
        totalEntities,
        totalRelationships,
        totalCost,
        averageQuality: completedJobs > 0 ? totalQuality / completedJobs : 0
      }

    } catch (error) {
      console.error('Failed to get processing stats:', error)
      return {
        totalJobs: 0,
        completedJobs: 0,
        totalEntities: 0,
        totalRelationships: 0,
        totalCost: 0,
        averageQuality: 0
      }
    }
  }
}