import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeUrl } from '@/lib/scraper'
import { getGlobalLLMIntegration } from '@/lib/llm/integration'

interface ConversionRequest {
  url: string
  options?: {
    includeImages?: boolean
    includeTables?: boolean
    removeCodeBlocks?: boolean
    waitForLoad?: number
    enableLLMProcessing?: boolean
    llmOptions?: {
      includeRelationships?: boolean
      includeAnalysis?: boolean
      confidenceThreshold?: number
    }
  }
}

interface ConversionResponse {
  success: boolean
  url: string
  data: {
    markdown: string
    title?: string
    description?: string
    images?: string[]
  }
  stats: {
    processingTime: number
    contentSize: number
    imageCount: number
  }
  metadata: {
    timestamp: string
    userAgent: string
    responseTime: number
  }
  llmProcessing?: {
    enabled: boolean
    jobId?: string
    entities?: Array<{
      name: string
      type: string
      confidence: number
    }>
    relationships?: Array<{
      sourceEntity: string
      targetEntity: string
      type: string
      confidence: number
    }>
    summary?: string
    keyInsights?: string[]
    processingTime?: number
    totalCost?: number
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `convert-${Date.now()}`

  try {
    const body: ConversionRequest = await request.json()
    
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URL is required'
          }
        },
        { status: 400 }
      )
    }

    // Validate URL format
    let url: URL
    try {
      url = new URL(body.url)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid URL format'
          }
        },
        { status: 400 }
      )
    }

    // Default options
    const options = {
      includeImages: true,
      includeTables: true,
      removeCodeBlocks: false,
      waitForLoad: 2000,
      ...body.options
    }

    // Use Playwright to scrape actual content
    const scrapingResult = await scrapeUrl(body.url, {
      includeImages: options.includeImages,
      includeTables: options.includeTables,
      removeCodeBlocks: options.removeCodeBlocks,
      waitForLoad: options.waitForLoad,
      timeout: 30000,
      userAgent: request.headers.get('user-agent') || 'Knowledge Graph Platform'
    })

    if (!scrapingResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: scrapingResult.error?.code || 'SCRAPING_FAILED',
            message: scrapingResult.error?.message || 'Failed to scrape content'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId
          }
        },
        { status: 500 }
      )
    }

    const processingTime = scrapingResult.stats.processingTime

    // Create a basic extraction session record
    const session = await prisma.extractionSession.create({
      data: {
        userId: 'dev-user', // In production, get from auth
        sessionName: `Single extraction: ${url.hostname}`,
        sourceUrl: body.url,
        totalUrls: 1,
        successfulUrls: 1,
        failedUrls: 0,
        processingTimeMs: BigInt(processingTime),
        status: 'completed',
        chunkSize: 1,
        maxRetries: 3,
        startedAt: new Date(startTime),
        completedAt: new Date()
      }
    })

    // Create URL extraction record
    await prisma.urlExtraction.create({
      data: {
        sessionId: session.id,
        url: body.url,
        chunkNumber: 1,
        sequenceNumber: 1,
        status: 'success',
        httpStatusCode: scrapingResult.metadata.httpStatusCode || 200,
        contentSizeBytes: BigInt(scrapingResult.stats.contentSize),
        processingTimeMs: processingTime,
        markdownContent: scrapingResult.data?.markdown || '',
        title: scrapingResult.data?.title || `Content from ${url.hostname}`,
        description: scrapingResult.data?.description || `Extracted content from ${body.url}`,
        imagesCount: scrapingResult.stats.imageCount,
        retryCount: 0,
        processedAt: new Date()
      }
    })

    // Optional LLM processing integration
    let llmProcessingResult = null
    if (body.options?.enableLLMProcessing && scrapingResult.data?.markdown) {
      try {
        console.log('Starting LLM processing for extracted content...')
        const llmIntegration = getGlobalLLMIntegration()
        
        // Override auto-processing options with user preferences
        if (body.options.llmOptions) {
          llmIntegration.updateOptions({
            enabled: true,
            includeRelationships: body.options.llmOptions.includeRelationships ?? true,
            includeAnalysis: body.options.llmOptions.includeAnalysis ?? true,
            confidenceThreshold: body.options.llmOptions.confidenceThreshold ?? 0.7
          })
        }

        llmProcessingResult = await llmIntegration.processContentIfEligible(
          session.id,
          scrapingResult.data.markdown,
          `convert-api-${url.hostname}`
        )

        if (llmProcessingResult) {
          console.log(`LLM processing completed: ${llmProcessingResult.entities.length} entities, ${llmProcessingResult.relationships.length} relationships`)
        } else {
          console.log('Content not eligible for LLM processing or processing failed')
        }
      } catch (llmError) {
        console.error('LLM processing failed:', llmError)
        // Continue without LLM processing - don't fail the entire request
      }
    }

    const response: ConversionResponse = {
      success: true,
      url: body.url,
      data: {
        markdown: scrapingResult.data?.markdown || '',
        title: scrapingResult.data?.title,
        description: scrapingResult.data?.description,
        images: scrapingResult.data?.images
      },
      stats: {
        processingTime,
        contentSize: scrapingResult.stats.contentSize,
        imageCount: scrapingResult.stats.imageCount
      },
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        responseTime: processingTime
      },
      llmProcessing: {
        enabled: body.options?.enableLLMProcessing || false,
        ...(llmProcessingResult && {
          jobId: `llm_${session.id}`,
          entities: llmProcessingResult.entities.map(e => ({
            name: e.name,
            type: e.type,
            confidence: e.confidence
          })),
          relationships: llmProcessingResult.relationships.map(r => {
            const sourceEntity = llmProcessingResult.entities.find(e => e.id === r.sourceEntityId)
            const targetEntity = llmProcessingResult.entities.find(e => e.id === r.targetEntityId)
            return {
              sourceEntity: sourceEntity?.name || 'Unknown',
              targetEntity: targetEntity?.name || 'Unknown',
              type: r.type,
              confidence: r.confidence
            }
          }),
          summary: llmProcessingResult.summary,
          keyInsights: llmProcessingResult.keyInsights,
          processingTime: llmProcessingResult.processing.processingTime,
          totalCost: llmProcessingResult.processing.totalCost
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        sessionId: session.id
      }
    })

  } catch (error) {
    console.error('Content conversion error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Content extraction failed'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      },
      { status: 500 }
    )
  }
}