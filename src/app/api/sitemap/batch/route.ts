import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeUrl } from '@/lib/scraper'
import { backgroundJobProcessor } from '@/lib/background-jobs'

interface BatchScrapingRequest {
  urls: string[]
  options?: {
    includeImages?: boolean
    includeTables?: boolean
    removeCodeBlocks?: boolean
    waitForLoad?: number
    maxConcurrent?: number
    enableLLMProcessing?: boolean
    llmOptions?: {
      includeRelationships?: boolean
      includeAnalysis?: boolean
      confidenceThreshold?: number
    }
  }
}

interface ScrapingResult {
  success: boolean
  url: string
  data?: {
    markdown: string
    title?: string
    description?: string
    images?: string[]
  }
  error?: {
    code: string
    message: string
  }
  stats: {
    processingTime: number
    contentSize: number
    imageCount: number
  }
  metadata: {
    timestamp: string
    httpStatusCode?: number
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
    error?: string
  }
}

interface BatchScrapingResult {
  success: boolean
  data: {
    results: ScrapingResult[]
    errors: Array<{
      url: string
      code: string
      message: string
      timestamp: string
    }>
    summary: {
      totalUrls: number
      successful: number
      failed: number
      successRate: number
      totalProcessingTime: number
    }
  }
  processing: {
    requestId: string
    startTime: string
    endTime: string
  }
}

async function processUrl(url: string, options: Record<string, unknown>, sessionId: string, chunkNumber: number, sequenceNumber: number): Promise<ScrapingResult> {
  const startTime = Date.now()
  
  try {
    // Validate URL
    new URL(url)
    
    console.log(`Processing URL: ${url} (chunk: ${chunkNumber}, sequence: ${sequenceNumber})`)
    
    // Real content extraction using scraper
    const scrapingResult = await scrapeUrl(url, {
      includeImages: options.includeImages as boolean,
      includeTables: options.includeTables as boolean,
      removeCodeBlocks: options.removeCodeBlocks as boolean,
      waitForLoad: options.waitForLoad as number
    })
    
    if (!scrapingResult.success || !scrapingResult.data) {
      // Create failed URL extraction record
      await prisma.urlExtraction.create({
        data: {
          sessionId,
          url,
          chunkNumber,
          sequenceNumber,
          status: 'failed',
          httpStatusCode: scrapingResult.metadata?.httpStatusCode || 500,
          processingTimeMs: Date.now() - startTime,
          errorCode: scrapingResult.error?.code || 'SCRAPING_FAILED',
          errorMessage: scrapingResult.error?.message || 'Content extraction failed',
          retryCount: 0,
          llmProcessingEnabled: (options.enableLLMProcessing as boolean) || false,
          llmProcessingStatus: (options.enableLLMProcessing as boolean) ? 'skipped' : null
        }
      })
      
      return {
        success: false,
        url,
        error: {
          code: scrapingResult.error?.code || 'SCRAPING_FAILED',
          message: scrapingResult.error?.message || 'Content extraction failed'
        },
        stats: {
          processingTime: Date.now() - startTime,
          contentSize: 0,
          imageCount: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          httpStatusCode: scrapingResult.metadata?.httpStatusCode || 500
        }
      }
    }
    
    const markdownContent = scrapingResult.data.markdown
    const contentSize = markdownContent.length
    const imageCount = scrapingResult.data.images?.length || 0
    
    // Create initial URL extraction record
    const urlExtraction = await prisma.urlExtraction.create({
      data: {
        sessionId,
        url,
        chunkNumber,
        sequenceNumber,
        status: 'success',
        httpStatusCode: 200,
        contentSizeBytes: BigInt(contentSize),
        processingTimeMs: Date.now() - startTime,
        markdownContent,
        title: scrapingResult.data.title,
        description: scrapingResult.data.description,
        imagesCount: imageCount,
        retryCount: 0,
        processedAt: new Date(),
        llmProcessingEnabled: (options.enableLLMProcessing as boolean) || false,
        llmProcessingStatus: (options.enableLLMProcessing as boolean) ? 'pending' : null
      }
    })
    
    let llmProcessingResult = undefined
    
    // Queue LLM processing if enabled (asynchronous)
    if ((options.enableLLMProcessing as boolean) && markdownContent.trim().length > 100) {
      try {
        console.log(`Queueing LLM processing for ${url}`)
        
        // Add to background job queue
        const jobId = await backgroundJobProcessor.addLLMJob({
          urlExtractionId: urlExtraction.id,
          sessionId,
          url,
          markdownContent,
          title: scrapingResult.data.title,
          description: scrapingResult.data.description,
          options: {
            includeRelationships: (options.llmOptions as Record<string, unknown>)?.includeRelationships as boolean ?? true,
            includeAnalysis: (options.llmOptions as Record<string, unknown>)?.includeAnalysis as boolean ?? true,
            confidenceThreshold: (options.llmOptions as Record<string, unknown>)?.confidenceThreshold as number ?? 0.7
          }
        })
        
        llmProcessingResult = {
          enabled: true,
          jobId
        }
        
        console.log(`LLM processing queued for ${url} (Job ID: ${jobId})`)
        
      } catch (llmError) {
        console.error(`Failed to queue LLM processing for ${url}:`, llmError)
        
        // Update with LLM error
        await prisma.urlExtraction.update({
          where: { id: urlExtraction.id },
          data: {
            llmProcessingStatus: 'failed',
            llmProcessingError: llmError instanceof Error ? llmError.message : 'Failed to queue LLM processing'
          }
        })
        
        llmProcessingResult = {
          enabled: true,
          error: llmError instanceof Error ? llmError.message : 'Failed to queue LLM processing'
        }
      }
    }
    
    // Determine overall success: scraping succeeded AND (if LLM enabled, job was queued successfully)
    const llmEnabled = (options.enableLLMProcessing as boolean) || false
    const llmSucceeded = llmProcessingResult ? !llmProcessingResult.error : true
    const overallSuccess = true // Always true for scraping success, LLM processes asynchronously

    return {
      success: overallSuccess,
      url,
      data: {
        markdown: markdownContent,
        title: scrapingResult.data.title,
        description: scrapingResult.data.description,
        images: scrapingResult.data.images || []
      },
      stats: {
        processingTime: Date.now() - startTime,
        contentSize,
        imageCount
      },
      metadata: {
        timestamp: new Date().toISOString(),
        httpStatusCode: 200
      },
      llmProcessing: llmProcessingResult
    }
    
  } catch (error) {
    console.error(`Processing error for ${url}:`, error)
    const finalProcessingTime = Date.now() - startTime
    
    // Create failed URL extraction record
    await prisma.urlExtraction.create({
      data: {
        sessionId,
        url,
        chunkNumber,
        sequenceNumber,
        status: 'failed',
        processingTimeMs: finalProcessingTime,
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        llmProcessingEnabled: (options.enableLLMProcessing as boolean) || false,
        llmProcessingStatus: (options.enableLLMProcessing as boolean) ? 'skipped' : null
      }
    })
    
    return {
      success: false,
      url,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      stats: {
        processingTime: finalProcessingTime,
        contentSize: 0,
        imageCount: 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        httpStatusCode: 500
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `batch-${Date.now()}`

  try {
    const body: BatchScrapingRequest = await request.json()
    
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URLs array is required and must not be empty'
          }
        },
        { status: 400 }
      )
    }

    // Validate URL count limit
    if (body.urls.length > 25) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_URLS',
            message: 'Maximum 25 URLs allowed per batch'
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
      maxConcurrent: 5,
      enableLLMProcessing: false,
      llmOptions: {
        includeRelationships: true,
        includeAnalysis: true,
        confidenceThreshold: 0.7
      },
      ...body.options
    }

    // Create extraction session
    const session = await prisma.extractionSession.create({
      data: {
        userId: 'dev-user', // In production, get from auth
        sessionName: `Batch extraction: ${body.urls.length} URLs`,
        sourceUrl: body.urls[0], // Use first URL as source
        totalUrls: body.urls.length,
        successfulUrls: 0, // Will be updated after processing
        failedUrls: 0, // Will be updated after processing
        status: 'processing',
        chunkSize: body.urls.length,
        maxRetries: 3,
        startedAt: new Date()
      }
    })

    // Process URLs with controlled concurrency
    const chunkNumber = 1
    const results: ScrapingResult[] = []
    const errors: Array<{ url: string; code: string; message: string; timestamp: string }> = []
    
    // Process URLs in parallel with limited concurrency
    const semaphore = new Array(options.maxConcurrent).fill(null)
    let currentIndex = 0
    
    const processNext = async (): Promise<void> => {
      if (currentIndex >= body.urls.length) return
      
      const urlIndex = currentIndex++
      const url = body.urls[urlIndex]
      
      try {
        const result = await processUrl(url, options, session.id, chunkNumber, urlIndex + 1)
        results.push(result)
        
        if (!result.success && result.error) {
          errors.push({
            url,
            code: result.error.code,
            message: result.error.message,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        const errorResult: ScrapingResult = {
          success: false,
          url,
          error: {
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          stats: {
            processingTime: 0,
            contentSize: 0,
            imageCount: 0
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
        results.push(errorResult)
        errors.push({
          url,
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
      
      // Process next URL
      return processNext()
    }
    
    // Start processing with concurrency limit
    await Promise.all(semaphore.map(() => processNext()))

    // Calculate summary
    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    const successRate = results.length > 0 ? (successful / results.length) * 100 : 0
    const totalProcessingTime = results.reduce((sum, r) => sum + r.stats.processingTime, 0)

    // Update session with final stats
    await prisma.extractionSession.update({
      where: { id: session.id },
      data: {
        successfulUrls: successful,
        failedUrls: failed,
        status: failed === 0 ? 'completed' : 'completed',
        processingTimeMs: BigInt(Date.now() - startTime),
        completedAt: new Date()
      }
    })

    const response: BatchScrapingResult = {
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalUrls: body.urls.length,
          successful,
          failed,
          successRate,
          totalProcessingTime
        }
      },
      processing: {
        requestId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      processing: response.processing,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        sessionId: session.id
      }
    })

  } catch (error) {
    console.error('Batch extraction error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCH_EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Batch extraction failed'
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