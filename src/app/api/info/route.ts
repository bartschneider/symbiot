import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        version: '1.0.0',
        capabilities: [
          'sitemap_discovery',
          'batch_extraction',
          'single_extraction',
          'progress_tracking',
          'extraction_history',
          'content_conversion'
        ],
        limits: {
          maxConcurrent: 5,
          maxUrls: 1000,
          timeout: 30000
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `info-${Date.now()}`
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_INFO_FAILED',
          message: 'Failed to get service information'
        }
      },
      { status: 500 }
    )
  }
}