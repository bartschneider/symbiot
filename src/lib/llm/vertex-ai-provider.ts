/**
 * Phase 3.5: Vertex AI Provider Implementation
 * 
 * Replaces multi-provider architecture with unified Vertex AI integration
 * Supports dynamic model switching between Gemini 2.5 Pro/Flash
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai'

export interface VertexAIConfig {
  project: string
  location: string
  defaultModel: GeminiModel
  modelStrategy: ModelSelectionStrategy
}

export interface GeminiModel {
  id: string
  displayName: string
  maxTokens: number
  costPer1000Tokens: number
  strengths: string[]
  supportsStreaming: boolean
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

export interface ModelSelectionStrategy {
  entityExtraction: string
  relationshipDetection: string
  contentAnalysis: string
  summarization: string
  validation: string
}

export interface VertexAIRequest {
  content: string
  taskType: 'entity_extraction' | 'relationship_detection' | 'content_analysis' | 'summarization' | 'validation'
  options?: {
    temperature?: number
    maxOutputTokens?: number
    systemInstruction?: string
    model?: string // Override model selection
    streaming?: boolean
  }
}

export interface VertexAIResponse {
  success: boolean
  model: string
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
  }
  processingTime: number
  confidence?: number
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

// Gemini 2.5 model configurations
export const GEMINI_MODELS: Record<string, GeminiModel> = {
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    maxTokens: 2000000, // 2M context window
    costPer1000Tokens: 0.0125, // Estimated pricing
    strengths: ['complex reasoning', 'high accuracy', 'multimodal', 'function calling'],
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 300,
      tokensPerMinute: 32000
    }
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 1000000, // 1M context window
    costPer1000Tokens: 0.00075, // Estimated pricing - much cheaper
    strengths: ['speed', 'efficiency', 'cost-effective', 'real-time'],
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 1000,
      tokensPerMinute: 100000
    }
  }
}

// Intelligent model selection strategy
export const MODEL_STRATEGY: ModelSelectionStrategy = {
  entityExtraction: 'gemini-2.5-pro',      // High accuracy needed
  relationshipDetection: 'gemini-2.5-pro', // Complex reasoning required
  contentAnalysis: 'gemini-2.5-pro',       // Comprehensive analysis
  summarization: 'gemini-2.5-flash',       // Speed over perfect accuracy
  validation: 'gemini-2.5-flash'           // Quick validation checks
}

// Default Vertex AI configuration
export const DEFAULT_VERTEX_CONFIG: VertexAIConfig = {
  project: process.env.GOOGLE_CLOUD_PROJECT || '',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  defaultModel: GEMINI_MODELS['gemini-2.5-pro'],
  modelStrategy: MODEL_STRATEGY
}

// Safety settings for content generation
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  }
]

// Generation configuration defaults
export const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 8192
}

export class VertexAIProvider {
  private vertexAI: VertexAI
  private config: VertexAIConfig

  constructor(config?: Partial<VertexAIConfig>) {
    this.config = { ...DEFAULT_VERTEX_CONFIG, ...config }
    
    if (!this.config.project) {
      throw new Error('Google Cloud Project ID is required. Set GOOGLE_CLOUD_PROJECT environment variable.')
    }

    this.vertexAI = new VertexAI({
      project: this.config.project,
      location: this.config.location
    })
  }

  /**
   * Select optimal model based on task type
   */
  private selectModel(taskType: string, override?: string): string {
    if (override && GEMINI_MODELS[override]) {
      return override
    }

    return this.config.modelStrategy[taskType as keyof ModelSelectionStrategy] || 
           this.config.defaultModel.id
  }

  /**
   * Generate content using Vertex AI
   */
  async generateContent(request: VertexAIRequest): Promise<VertexAIResponse> {
    const startTime = Date.now()
    const selectedModel = this.selectModel(request.taskType, request.options?.model)
    const modelConfig = GEMINI_MODELS[selectedModel]

    if (!modelConfig) {
      throw new Error(`Unknown model: ${selectedModel}`)
    }

    try {
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: selectedModel,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          ...GENERATION_CONFIG,
          temperature: request.options?.temperature ?? GENERATION_CONFIG.temperature,
          maxOutputTokens: request.options?.maxOutputTokens ?? GENERATION_CONFIG.maxOutputTokens
        },
        systemInstruction: request.options?.systemInstruction ? {
          role: 'system',
          parts: [{ text: request.options.systemInstruction }]
        } : undefined
      })

      const requestPayload = {
        contents: [{
          role: 'user',
          parts: [{ text: request.content }]
        }]
      }

      const result = request.options?.streaming 
        ? await generativeModel.generateContentStream(requestPayload)
        : await generativeModel.generateContent(requestPayload)

      const response = request.options?.streaming 
        ? await (result as any).response 
        : result.response

      const processingTime = Date.now() - startTime
      const usage = response.usageMetadata || {}

      return {
        success: true,
        model: selectedModel,
        content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
          estimatedCost: this.calculateCost(usage.totalTokenCount || 0, modelConfig.costPer1000Tokens)
        },
        processingTime,
        confidence: this.extractConfidence(response)
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        model: selectedModel,
        content: '',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0
        },
        processingTime,
        error: {
          code: error.code || 'VERTEX_AI_ERROR',
          message: error.message || 'Unknown Vertex AI error',
          retryable: this.isRetryableError(error)
        }
      }
    }
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(totalTokens: number, costPer1000: number): number {
    return (totalTokens / 1000) * costPer1000
  }

  /**
   * Extract confidence score from response
   */
  private extractConfidence(response: any): number | undefined {
    // Vertex AI doesn't provide explicit confidence scores
    // We can infer confidence from safety ratings and finish reason
    const candidate = response.candidates?.[0]
    if (!candidate) return undefined

    const finishReason = candidate.finishReason
    if (finishReason === 'STOP') return 0.9
    if (finishReason === 'MAX_TOKENS') return 0.8
    if (finishReason === 'SAFETY') return 0.3
    
    return 0.7 // Default confidence
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'RATE_LIMIT_EXCEEDED',
      'INTERNAL_ERROR', 
      'SERVICE_UNAVAILABLE',
      'TIMEOUT'
    ]
    return retryableCodes.includes(error.code) || error.status >= 500
  }

  /**
   * Get model information
   */
  getModelInfo(modelId?: string): GeminiModel {
    const id = modelId || this.config.defaultModel.id
    return GEMINI_MODELS[id] || this.config.defaultModel
  }

  /**
   * List available models
   */
  getAvailableModels(): GeminiModel[] {
    return Object.values(GEMINI_MODELS)
  }

  /**
   * Get current configuration
   */
  getConfig(): VertexAIConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const vertexAIProvider = new VertexAIProvider()