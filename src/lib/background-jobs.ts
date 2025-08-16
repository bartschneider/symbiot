/**
 * Background Job Processing System
 * Handles long-running LLM processing tasks asynchronously
 */

import { prisma } from '@/lib/prisma'
import { getGlobalLLMIntegration } from '@/lib/llm/integration'
import { DualWriteService } from '@/lib/neo4j/dual-write'

export interface LLMJob {
  id: string
  urlExtractionId: string
  sessionId: string
  url: string
  markdownContent: string
  title?: string
  description?: string
  options: {
    includeRelationships?: boolean
    includeAnalysis?: boolean
    confidenceThreshold?: number
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export interface JobProgress {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  currentJob?: string
  estimatedTimeRemaining?: number
}

class BackgroundJobProcessor {
  private static instance: BackgroundJobProcessor
  private processing = false
  private jobQueue: LLMJob[] = []
  private currentJob: LLMJob | null = null
  private stats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    averageProcessingTime: 0
  }

  static getInstance(): BackgroundJobProcessor {
    if (!BackgroundJobProcessor.instance) {
      BackgroundJobProcessor.instance = new BackgroundJobProcessor()
    }
    return BackgroundJobProcessor.instance
  }

  /**
   * Add LLM processing job to background queue
   */
  async addLLMJob(job: Omit<LLMJob, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const llmJob: LLMJob = {
      ...job,
      id: `llm_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date()
    }

    this.jobQueue.push(llmJob)
    console.log(`Added LLM job ${llmJob.id} to queue (${this.jobQueue.length} jobs pending)`)

    // Update database status
    await prisma.urlExtraction.update({
      where: { id: job.urlExtractionId },
      data: { 
        llmProcessingStatus: 'pending',
        llmJobId: llmJob.id
      }
    })

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing()
    }

    return llmJob.id
  }

  /**
   * Start background job processing
   */
  private async startProcessing(): Promise<void> {
    if (this.processing) return

    this.processing = true
    console.log('🚀 Starting background LLM job processing...')

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()!
      await this.processJob(job)
    }

    this.processing = false
    console.log('✅ Background LLM job processing completed')
  }

  /**
   * Process individual LLM job
   */
  private async processJob(job: LLMJob): Promise<void> {
    const startTime = Date.now()
    this.currentJob = job

    try {
      console.log(`🔄 Processing LLM job ${job.id} for ${job.url}`)

      // Update job status to processing
      job.status = 'processing'
      job.startedAt = new Date()

      await prisma.urlExtraction.update({
        where: { id: job.urlExtractionId },
        data: { 
          llmProcessingStatus: 'processing',
          llmProcessingStartedAt: job.startedAt
        }
      })

      // Get LLM processor
      const llmIntegration = getGlobalLLMIntegration()
      const processor = llmIntegration.getProcessor()
      if (!processor) {
        throw new Error('LLM processor not available')
      }

      // Process content with LLM
      const processingResult = await processor.processContent(job.markdownContent, {
        includeRelationships: job.options.includeRelationships ?? true,
        includeAnalysis: job.options.includeAnalysis ?? true,
        confidenceThreshold: job.options.confidenceThreshold ?? 0.7,
        maxChunks: 3,
        timeout: 180000 // 3 minutes timeout per job
      })

      const processingTime = Date.now() - startTime

      // Store results using dual-write service
      const dualWriteResult = await DualWriteService.storeLLMResults(
        {
          id: job.urlExtractionId,
          sessionId: job.sessionId,
          url: job.url,
          markdownContent: job.markdownContent,
          title: job.title,
          description: job.description,
          llmProvider: 'vertex-ai'
        },
        processingResult,
        processingTime
      )

      if (!dualWriteResult.postgresSuccess) {
        throw new Error(`LLM result storage failed: ${dualWriteResult.errors.join(', ')}`)
      }

      // Update job status to completed
      job.status = 'completed'
      job.completedAt = new Date()

      await prisma.urlExtraction.update({
        where: { id: job.urlExtractionId },
        data: { 
          llmProcessingStatus: 'completed',
          llmProcessingCompletedAt: job.completedAt,
          llmProcessingTimeMs: processingTime,
          llmEntitiesCount: processingResult.entities.length,
          llmRelationshipsCount: processingResult.relationships.length,
          llmProcessingCost: Math.round(processingResult.processing.totalCost * 100) // Store in cents
        }
      })

      // Update stats
      this.stats.totalProcessed++
      this.stats.successful++
      this.updateAverageProcessingTime(processingTime)

      console.log(`✅ LLM job ${job.id} completed: ${processingResult.entities.length} entities, ${processingResult.relationships.length} relationships (${processingTime}ms)`)

    } catch (error) {
      console.error(`❌ LLM job ${job.id} failed:`, error)

      // Update job status to failed
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.completedAt = new Date()

      await prisma.urlExtraction.update({
        where: { id: job.urlExtractionId },
        data: { 
          llmProcessingStatus: 'failed',
          llmProcessingError: job.error,
          llmProcessingCompletedAt: job.completedAt
        }
      })

      // Update stats
      this.stats.totalProcessed++
      this.stats.failed++
    }

    this.currentJob = null
  }

  /**
   * Get current job processing progress
   */
  getProgress(sessionId: string): JobProgress {
    const sessionJobs = this.jobQueue.filter(job => job.sessionId === sessionId)
    
    return {
      totalJobs: sessionJobs.length + (this.currentJob?.sessionId === sessionId ? 1 : 0),
      completedJobs: 0, // Will be calculated from database
      failedJobs: 0,    // Will be calculated from database
      currentJob: this.currentJob?.sessionId === sessionId ? this.currentJob.url : undefined,
      estimatedTimeRemaining: sessionJobs.length * this.stats.averageProcessingTime
    }
  }

  /**
   * Get overall processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.jobQueue.length,
      currentlyProcessing: this.currentJob?.id || null,
      isProcessing: this.processing
    }
  }

  /**
   * Get session-specific progress from database
   */
  async getSessionProgress(sessionId: string): Promise<JobProgress> {
    const urlExtractions = await prisma.urlExtraction.findMany({
      where: { 
        sessionId,
        llmProcessingEnabled: true
      },
      select: {
        id: true,
        url: true,
        llmProcessingStatus: true
      }
    })

    const total = urlExtractions.length
    const completed = urlExtractions.filter(e => e.llmProcessingStatus === 'completed').length
    const failed = urlExtractions.filter(e => e.llmProcessingStatus === 'failed').length
    const processing = urlExtractions.find(e => e.llmProcessingStatus === 'processing')

    return {
      totalJobs: total,
      completedJobs: completed,
      failedJobs: failed,
      currentJob: processing?.url,
      estimatedTimeRemaining: (total - completed - failed) * this.stats.averageProcessingTime
    }
  }

  private updateAverageProcessingTime(newTime: number): void {
    if (this.stats.successful === 1) {
      this.stats.averageProcessingTime = newTime
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.successful - 1) + newTime) / this.stats.successful
    }
  }
}

// Export singleton instance
export const backgroundJobProcessor = BackgroundJobProcessor.getInstance()