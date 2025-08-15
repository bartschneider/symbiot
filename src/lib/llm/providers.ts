/**
 * Multi-provider LLM integration framework for Phase 3
 * Supports OpenAI GPT-4 and Anthropic Claude with fallback strategies
 */

export interface LLMProvider {
  name: string
  maxTokens: number
  costPer1000Tokens: number
  supportsStreaming: boolean
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

export interface LLMRequest {
  content: string
  taskType: 'entity_extraction' | 'relationship_detection' | 'content_analysis' | 'summarization'
  options?: {
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    responseFormat?: 'json' | 'text'
  }
}

export interface LLMResponse {
  success: boolean
  provider: string
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

export interface Entity {
  id: string
  name: string
  type: 'person' | 'organization' | 'concept' | 'location' | 'technology'
  confidence: number
  context: string
  sourceSpan?: {
    start: number
    end: number
  }
  metadata?: Record<string, any>
}

export interface Relationship {
  id: string
  sourceEntityId: string
  targetEntityId: string
  type: 'works_for' | 'competes_with' | 'influences' | 'related_to' | 'part_of' | 'located_in'
  confidence: number
  context: string
  metadata?: Record<string, any>
}

export interface ProcessingResult {
  entities: Entity[]
  relationships: Relationship[]
  summary: string
  keyInsights: string[]
  quality: {
    contentPreservationRatio: number
    extractionConfidence: number
    completenessScore: number
  }
  processing: {
    provider: string
    processingTime: number
    totalCost: number
    retryCount: number
  }
}

// Provider configurations
export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  openai: {
    name: 'OpenAI GPT-4',
    maxTokens: 128000,
    costPer1000Tokens: 0.03, // GPT-4 Turbo pricing
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 500,
      tokensPerMinute: 150000
    }
  },
  anthropic: {
    name: 'Anthropic Claude',
    maxTokens: 200000,
    costPer1000Tokens: 0.015, // Claude 3 Haiku pricing
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 1000,
      tokensPerMinute: 100000
    }
  }
}

// Fallback strategy configuration
export const FALLBACK_STRATEGY = {
  primary: 'openai',
  secondary: 'anthropic',
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  timeoutMs: 30000
}

// Processing quality thresholds
export const QUALITY_THRESHOLDS = {
  entityConfidence: 0.7,
  relationshipConfidence: 0.6,
  minimumEntities: 3,
  minimumContent: 100, // characters
  maxProcessingTime: 300000 // 5 minutes
}

// Entity type definitions
export const ENTITY_TYPES = {
  person: {
    name: 'Person',
    description: 'Individual people, including names, titles, roles',
    examples: ['John Smith', 'CEO Sarah Johnson', 'Dr. Michael Chen']
  },
  organization: {
    name: 'Organization',
    description: 'Companies, institutions, government bodies',
    examples: ['TechCorp', 'DataFlow Solutions', 'Stanford University']
  },
  concept: {
    name: 'Concept',
    description: 'Abstract ideas, methodologies, principles',
    examples: ['machine learning', 'data analytics', 'customer satisfaction']
  },
  location: {
    name: 'Location',
    description: 'Geographic places, addresses, regions',
    examples: ['San Francisco', 'California', '123 Main Street']
  },
  technology: {
    name: 'Technology',
    description: 'Technical systems, platforms, tools, software',
    examples: ['AI platform', 'customer management system', 'React']
  }
} as const

// Relationship type definitions
export const RELATIONSHIP_TYPES = {
  works_for: {
    name: 'Works For',
    description: 'Employment or professional relationship',
    examples: ['John works for TechCorp', 'Sarah Johnson is CEO of DataFlow']
  },
  competes_with: {
    name: 'Competes With',
    description: 'Competitive business relationship',
    examples: ['TechCorp competes with MegaCorp', 'iOS competes with Android']
  },
  influences: {
    name: 'Influences',
    description: 'One entity affects or impacts another',
    examples: ['AI influences business decisions', 'Market trends influence pricing']
  },
  related_to: {
    name: 'Related To',
    description: 'General association or connection',
    examples: ['Machine learning related to data science', 'Privacy related to security']
  },
  part_of: {
    name: 'Part Of',
    description: 'Component or subset relationship',
    examples: ['Frontend part of application', 'Department part of company']
  },
  located_in: {
    name: 'Located In',
    description: 'Geographic or organizational location',
    examples: ['TechCorp located in San Francisco', 'Office located in building']
  }
} as const