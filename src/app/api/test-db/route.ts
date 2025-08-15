import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic connection by counting sessions
    const sessionCount = await prisma.extractionSession.count()
    
    // Test with a simple query
    const recentSessions = await prisma.extractionSession.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        userId: true,
        sessionName: true,
        status: true,
        createdAt: true,
        totalUrls: true,
        successfulUrls: true,
        failedUrls: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        sessionCount,
        recentSessions,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}