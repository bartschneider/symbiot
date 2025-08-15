/**
 * LLM Integration utilities for automatic processing
 * Connects existing content extraction with LLM knowledge extraction
 */

import { LLMClient } from './client'
import { ContentProcessor } from './processor'
import { LLMDatabaseManager } from './database'
import { ProcessingResult } from './providers'

export interface AutoProcessingOptions {
  enabled: boolean
  minContentLength: number
  maxContentLength: number
  autoProcessDelay: number // milliseconds to wait after content extraction
  confidenceThreshold: number
  includeRelationships: boolean
  includeAnalysis: boolean
  costLimitCents: number // daily cost limit in cents
}

export const DEFAULT_AUTO_PROCESSING: AutoProcessingOptions = {
  enabled: false, // Disabled by default to avoid unexpected costs
  minContentLength: 500,
  maxContentLength: 50000,
  autoProcessDelay: 2000,
  confidenceThreshold: 0.7,
  includeRelationships: true,
  includeAnalysis: true,
  costLimitCents: 1000 // $10 daily limit
}

export class LLMIntegrationManager {
  private processor?: ContentProcessor
  private dbManager: LLMDatabaseManager
  private dailyCostCents: number = 0
  private options: AutoProcessingOptions

  constructor(options: Partial<AutoProcessingOptions> = {}) {
    this.options = { ...DEFAULT_AUTO_PROCESSING, ...options }
    this.dbManager = new LLMDatabaseManager()
    this.initializeLLMProcessor()
  }

  private initializeLLMProcessor(): void {
    try {
      const apiKeys = {
        openai: process.env.OPENAI_API_KEY || '',
        anthropic: process.env.ANTHROPIC_API_KEY || ''
      }

      if (apiKeys.openai || apiKeys.anthropic) {
        const llmClient = new LLMClient(apiKeys)
        this.processor = new ContentProcessor(llmClient)
        console.log('LLM processor initialized successfully')
      } else {
        console.warn('No LLM API keys found - automatic processing disabled')
        this.options.enabled = false
      }
    } catch (error) {
      console.error('Failed to initialize LLM processor:', error)
      this.options.enabled = false
    }
  }

  public async shouldProcessContent(content: string): Promise<boolean> {
    if (!this.options.enabled || !this.processor) {
      return false
    }

    // Check content length constraints
    if (content.length < this.options.minContentLength || 
        content.length > this.options.maxContentLength) {
      return false
    }

    // Check daily cost limit
    const currentStats = await this.dbManager.getProcessingStats()
    const todaysCostCents = Math.round(currentStats.totalCost * 100)
    
    if (todaysCostCents >= this.options.costLimitCents) {
      console.warn(`Daily LLM cost limit reached: ${todaysCostCents}¢ >= ${this.options.costLimitCents}¢`)
      return false
    }

    // Check if content appears to be substantial and meaningful
    const wordCount = content.trim().split(/\s+/).length
    if (wordCount < 50) {
      return false
    }

    // Basic content quality check
    const hasProperSentences = /[.!?]/.test(content)
    const hasCapitalization = /[A-Z]/.test(content)
    
    return hasProperSentences && hasCapitalization
  }

  public async processContentIfEligible(
    sessionId: string,
    content: string,
    contentSource: string = 'unknown'
  ): Promise<ProcessingResult | null> {
    try {
      const shouldProcess = await this.shouldProcessContent(content)
      
      if (!shouldProcess) {
        console.log(`Content from ${contentSource} not eligible for LLM processing`)
        return null
      }

      if (!this.processor) {
        console.error('LLM processor not available')
        return null
      }

      console.log(`Auto-processing content from ${contentSource} (${content.length} chars)`)

      // Add delay to avoid overwhelming the system
      if (this.options.autoProcessDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.options.autoProcessDelay))
      }

      // Process content
      const result = await this.processor.processContent(content, {
        includeRelationships: this.options.includeRelationships,
        includeAnalysis: this.options.includeAnalysis,
        confidenceThreshold: this.options.confidenceThreshold,
        maxChunks: 3,
        timeout: 60000 // 1 minute timeout for auto-processing
      })

      // Store results
      const contentHash = Buffer.from(content).toString('base64').slice(0, 32)
      const jobId = await this.dbManager.createProcessingJob(
        sessionId,
        'auto-processor',
        contentHash,
        { source: contentSource, autoProcessed: true }
      )

      await this.dbManager.storeProcessingResult(jobId, sessionId, result)
      await this.dbManager.updateJobStatus(jobId, 'completed', result)

      console.log(`Auto-processing completed: ${result.entities.length} entities, ${result.relationships.length} relationships`)
      console.log(`Processing cost: $${result.processing.totalCost.toFixed(4)}`)

      return result

    } catch (error) {
      console.error('Auto-processing failed:', error)
      return null
    }
  }

  public async getProcessingSummary(): Promise<{
    enabled: boolean
    todaysCostCents: number
    costLimitCents: number
    remainingBudgetCents: number
    processingStats: any
  }> {
    const stats = await this.dbManager.getProcessingStats()
    const todaysCostCents = Math.round(stats.totalCost * 100)
    
    return {
      enabled: this.options.enabled,
      todaysCostCents,
      costLimitCents: this.options.costLimitCents,
      remainingBudgetCents: Math.max(0, this.options.costLimitCents - todaysCostCents),
      processingStats: stats
    }
  }

  public updateOptions(newOptions: Partial<AutoProcessingOptions>): void {
    this.options = { ...this.options, ...newOptions }
    
    // Re-initialize processor if needed
    if (newOptions.enabled && !this.processor) {
      this.initializeLLMProcessor()
    }
  }

  public getOptions(): AutoProcessingOptions {
    return { ...this.options }
  }
}

// Global instance for automatic processing
let globalIntegrationManager: LLMIntegrationManager | null = null

export function getGlobalLLMIntegration(): LLMIntegrationManager {
  if (!globalIntegrationManager) {
    globalIntegrationManager = new LLMIntegrationManager({
      enabled: process.env.LLM_AUTO_PROCESSING === 'true',
      costLimitCents: parseInt(process.env.LLM_DAILY_COST_LIMIT_CENTS || '1000')
    })
  }
  return globalIntegrationManager
}

// Utility function for manual processing triggers
export async function triggerLLMProcessing(
  sessionId: string,
  content: string,
  options?: {
    force?: boolean
    source?: string
    customOptions?: Partial<AutoProcessingOptions>
  }
): Promise<ProcessingResult | null> {
  const manager = options?.customOptions 
    ? new LLMIntegrationManager(options.customOptions)
    : getGlobalLLMIntegration()

  if (options?.force) {
    // Force processing even if auto-processing is disabled
    const tempOptions = manager.getOptions()
    manager.updateOptions({ enabled: true })
    
    const result = await manager.processContentIfEligible(
      sessionId, 
      content, 
      options.source || 'manual-trigger'
    )
    
    manager.updateOptions(tempOptions) // Restore original options
    return result
  }

  return manager.processContentIfEligible(sessionId, content, options?.source || 'manual-trigger')
}