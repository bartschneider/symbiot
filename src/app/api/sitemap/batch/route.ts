import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface BatchScrapingRequest {
  urls: string[]
  options?: {
    includeImages?: boolean
    includeTables?: boolean
    removeCodeBlocks?: boolean
    waitForLoad?: number
    maxConcurrent?: number
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

async function processUrl(url: string, options: any, sessionId: string, chunkNumber: number, sequenceNumber: number): Promise<ScrapingResult> {
  const startTime = Date.now()
  
  try {
    // Validate URL
    new URL(url)
    
    // Simulate processing time (replace with actual Firecrawl integration)
    const processingTime = Math.random() * 3000 + 500 // 0.5-3.5 seconds
    await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 5000)))
    
    // Mock success rate (90% success rate for testing)
    const success = Math.random() > 0.1
    
    if (!success) {
      // Create failed URL extraction record
      await prisma.urlExtraction.create({
        data: {
          sessionId,
          url,
          chunkNumber,
          sequenceNumber,
          status: 'failed',
          httpStatusCode: 404,
          processingTimeMs: Date.now() - startTime,
          errorCode: 'FETCH_FAILED',
          errorMessage: 'Failed to fetch content from URL',
          retryCount: 0
        }
      })
      
      return {
        success: false,
        url,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch content from URL'
        },
        stats: {
          processingTime: Date.now() - startTime,
          contentSize: 0,
          imageCount: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          httpStatusCode: 404
        }
      }
    }
    
    // Mock successful extraction
    const urlObj = new URL(url)
    const mockContent = `# ${urlObj.hostname}\n\nContent extracted from: ${url}\n\nThis is a simulated batch extraction.\n\n## Processing Info\n- Chunk: ${chunkNumber}\n- Sequence: ${sequenceNumber}\n- Include Images: ${options.includeImages}\n- Include Tables: ${options.includeTables}`
    
    const finalProcessingTime = Date.now() - startTime
    
    // Create successful URL extraction record
    await prisma.urlExtraction.create({
      data: {
        sessionId,
        url,
        chunkNumber,
        sequenceNumber,
        status: 'success',
        httpStatusCode: 200,
        contentSizeBytes: BigInt(mockContent.length),
        processingTimeMs: finalProcessingTime,
        markdownContent: mockContent,
        title: `Content from ${urlObj.hostname}`,
        description: `Extracted content from ${url}`,
        imagesCount: 0,
        retryCount: 0,
        processedAt: new Date()
      }
    })
    
    return {
      success: true,
      url,
      data: {
        markdown: mockContent,
        title: `Content from ${urlObj.hostname}`,
        description: `Extracted content from ${url}`,
        images: []
      },
      stats: {
        processingTime: finalProcessingTime,
        contentSize: mockContent.length,
        imageCount: 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        httpStatusCode: 200
      }
    }
    
  } catch (error) {
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
        retryCount: 0
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