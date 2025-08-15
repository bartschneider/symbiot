/**
 * Multi-provider LLM client with fallback strategies and cost management
 * Supports OpenAI GPT-4 and Anthropic Claude for Phase 3 implementation
 */

import { LLMRequest, LLMResponse, LLM_PROVIDERS, FALLBACK_STRATEGY } from './providers'

export class LLMClient {
  private apiKeys: Record<string, string>
  private requestCounts: Record<string, { count: number; resetTime: number }> = {}
  private totalCost: number = 0

  constructor(apiKeys: Record<string, string>) {
    this.apiKeys = apiKeys
    this.initializeRateLimits()
  }

  private initializeRateLimits(): void {
    Object.keys(LLM_PROVIDERS).forEach(provider => {
      this.requestCounts[provider] = {
        count: 0,
        resetTime: Date.now() + 60000 // Reset every minute
      }
    })
  }

  private checkRateLimit(provider: string): boolean {
    const limit = this.requestCounts[provider]
    const now = Date.now()
    
    // Reset counter if minute has passed
    if (now >= limit.resetTime) {
      limit.count = 0
      limit.resetTime = now + 60000
    }
    
    const maxRequests = LLM_PROVIDERS[provider].rateLimit.requestsPerMinute
    return limit.count < maxRequests
  }

  private incrementRateLimit(provider: string): void {
    this.requestCounts[provider].count++
  }

  private calculateCost(provider: string, tokens: number): number {
    const costPer1000 = LLM_PROVIDERS[provider].costPer1000Tokens
    return (tokens / 1000) * costPer1000
  }

  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    if (!this.apiKeys.openai) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKeys.openai}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: request.options?.systemPrompt || 'You are a helpful assistant.'
          },
          {
            role: 'user', 
            content: request.content
          }
        ],
        temperature: request.options?.temperature || 0.1,
        max_tokens: request.options?.maxTokens || 4000,
        response_format: request.options?.responseFormat === 'json' 
          ? { type: 'json_object' } 
          : undefined
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const usage = data.usage
    const processingTime = Date.now() - startTime
    const cost = this.calculateCost('openai', usage.total_tokens)
    
    this.totalCost += cost

    return {
      success: true,
      provider: 'openai',
      content: data.choices[0].message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: cost
      },
      processingTime
    }
  }

  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    if (!this.apiKeys.anthropic) {
      throw new Error('Anthropic API key not configured')
    }

    const systemPrompt = request.options?.systemPrompt || 'You are a helpful assistant.'
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKeys.anthropic,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: request.options?.maxTokens || 4000,
        temperature: request.options?.temperature || 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.content
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const usage = data.usage
    const processingTime = Date.now() - startTime
    const cost = this.calculateCost('anthropic', usage.input_tokens + usage.output_tokens)
    
    this.totalCost += cost

    return {
      success: true,
      provider: 'anthropic',
      content: data.content[0].text,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        estimatedCost: cost
      },
      processingTime
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public async process(request: LLMRequest): Promise<LLMResponse> {
    const providers = [FALLBACK_STRATEGY.primary, FALLBACK_STRATEGY.secondary]
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < FALLBACK_STRATEGY.maxRetries; attempt++) {
      for (const provider of providers) {
        try {
          // Check rate limits
          if (!this.checkRateLimit(provider)) {
            console.warn(`Rate limit exceeded for ${provider}, trying next provider`)
            continue
          }

          // Check if API key is available
          if (!this.apiKeys[provider]) {
            console.warn(`API key not available for ${provider}, trying next provider`)
            continue
          }

          console.log(`Attempting LLM request with ${provider} (attempt ${attempt + 1})`)
          
          this.incrementRateLimit(provider)
          
          let response: LLMResponse
          if (provider === 'openai') {
            response = await this.callOpenAI(request)
          } else if (provider === 'anthropic') {
            response = await this.callAnthropic(request)
          } else {
            throw new Error(`Unsupported provider: ${provider}`)
          }

          console.log(`LLM request successful with ${provider}: ${response.usage.totalTokens} tokens, $${response.usage.estimatedCost.toFixed(4)}`)
          return response
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error')
          console.error(`LLM request failed with ${provider}:`, lastError.message)
          
          // If it's a rate limit or temporary error, try next provider
          if (error instanceof Error && (
            error.message.includes('rate limit') ||
            error.message.includes('timeout') ||
            error.message.includes('503') ||
            error.message.includes('502')
          )) {
            continue
          }
          
          // For other errors, still try next provider but log more details
          console.error(`Provider ${provider} failed with non-retryable error:`, error)
        }
      }
      
      // If all providers failed, wait before retry
      if (attempt < FALLBACK_STRATEGY.maxRetries - 1) {
        const delayMs = FALLBACK_STRATEGY.retryDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`All providers failed, retrying in ${delayMs}ms...`)
        await this.delay(delayMs)
      }
    }

    // All retries exhausted
    return {
      success: false,
      provider: 'none',
      content: '',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      processingTime: 0,
      error: {
        code: 'ALL_PROVIDERS_FAILED',
        message: lastError?.message || 'All LLM providers failed after retries',
        retryable: false
      }
    }
  }

  public getTotalCost(): number {
    return this.totalCost
  }

  public getUsageStats(): Record<string, any> {
    return {
      totalCost: this.totalCost,
      requestCounts: { ...this.requestCounts },
      providers: Object.keys(LLM_PROVIDERS).map(key => ({
        available: !!this.apiKeys[key],
        ...LLM_PROVIDERS[key]
      }))
    }
  }
}