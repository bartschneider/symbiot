import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URL parameter is required'
          }
        },
        { status: 400 }
      )
    }

    // Find the most recent extraction for this URL
    const recentExtraction = await prisma.urlExtraction.findFirst({
      where: {
        url: url
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        session: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    // Count total extractions for this URL
    const extractionCount = await prisma.urlExtraction.count({
      where: {
        url: url
      }
    })

    const result = {
      exists: !!recentExtraction,
      lastExtracted: recentExtraction?.processedAt?.toISOString() || recentExtraction?.createdAt?.toISOString(),
      extractionCount,
      lastStatus: recentExtraction?.status === 'success' ? 'success' as const : 
                  recentExtraction?.status === 'failed' ? 'failed' as const :
                  recentExtraction?.status === 'processing' ? 'processing' as const : undefined,
      sessionId: recentExtraction?.sessionId
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `check-${Date.now()}`
      }
    })

  } catch (error) {
    console.error('Extraction history check error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HISTORY_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check extraction history'
        }
      },
      { status: 500 }
    )
  }
}