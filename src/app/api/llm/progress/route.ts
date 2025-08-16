/**
 * LLM Processing Progress API
 * Provides real-time progress updates for background LLM jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { backgroundJobProcessor } from '@/lib/background-jobs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'sessionId parameter is required'
          }
        },
        { status: 400 }
      )
    }

    // Get session-specific progress
    const sessionProgress = await backgroundJobProcessor.getSessionProgress(sessionId)
    
    // Get overall processor stats
    const processorStats = backgroundJobProcessor.getStats()

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: sessionId,
          progress: sessionProgress,
          completionRate: sessionProgress.totalJobs > 0 
            ? ((sessionProgress.completedJobs + sessionProgress.failedJobs) / sessionProgress.totalJobs) * 100 
            : 0
        },
        processor: {
          isActive: processorStats.isProcessing,
          queueLength: processorStats.queueLength,
          stats: {
            totalProcessed: processorStats.totalProcessed,
            successRate: processorStats.totalProcessed > 0 
              ? (processorStats.successful / processorStats.totalProcessed) * 100 
              : 0,
            averageProcessingTime: Math.round(processorStats.averageProcessingTime)
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        refreshRecommended: sessionProgress.totalJobs > sessionProgress.completedJobs + sessionProgress.failedJobs
      }
    })

  } catch (error) {
    console.error('Progress API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROGRESS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch progress'
        }
      },
      { status: 500 }
    )
  }
}