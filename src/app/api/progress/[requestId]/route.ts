import { NextRequest, NextResponse } from 'next/server'

interface ProgressUpdate {
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: {
    percentage: number
    currentUrl: string
    completed: number
    total: number
    rate: number
    eta: number
  }
  timestamp: string
  results?: any[]
}

// In-memory progress store (in production, use Redis or database)
const progressStore = new Map<string, ProgressUpdate>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

    // Get progress from store
    const progress = progressStore.get(requestId)

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROGRESS_NOT_FOUND',
            message: 'Progress tracking not found for this request ID'
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: progress,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `progress-${Date.now()}`
      }
    })

  } catch (error) {
    console.error('Get progress error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROGRESS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get progress'
        }
      },
      { status: 500 }
    )
  }
}