import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50 per page
    const status = searchParams.get('status')
    const sourceUrl = searchParams.get('sourceUrl')

    // Build where clause
    const where: any = {
      userId: 'dev-user' // In production, get from auth
    }
    
    if (status) {
      where.status = status
    }
    
    if (sourceUrl) {
      where.sourceUrl = {
        contains: sourceUrl,
        mode: 'insensitive'
      }
    }

    // Get total count for pagination
    const total = await prisma.extractionSession.count({ where })

    // Get sessions with pagination
    const sessions = await prisma.extractionSession.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sessionName: true,
        sourceUrl: true,
        status: true,
        totalUrls: true,
        successfulUrls: true,
        failedUrls: true,
        createdAt: true,
        completedAt: true,
        processingTimeMs: true
      }
    })

    // Format sessions with calculated success rate
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      sessionName: session.sessionName || `Session ${session.id.slice(0, 8)}`,
      sourceUrl: session.sourceUrl,
      status: session.status,
      totalUrls: session.totalUrls,
      successfulUrls: session.successfulUrls,
      failedUrls: session.failedUrls,
      successRatePercent: session.totalUrls > 0 ? Math.round((session.successfulUrls / session.totalUrls) * 100) : 0,
      createdAt: session.createdAt?.toISOString() || new Date().toISOString(),
      completedAt: session.completedAt?.toISOString(),
      processingTimeMs: session.processingTimeMs ? Number(session.processingTimeMs) : 0
    }))

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `sessions-${Date.now()}`
      }
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SESSIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get extraction sessions'
        }
      },
      { status: 500 }
    )
  }
}