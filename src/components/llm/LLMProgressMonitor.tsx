'use client'

import React, { useState, useEffect } from 'react'

interface LLMProgressData {
  session: {
    id: string
    progress: {
      totalJobs: number
      completedJobs: number
      failedJobs: number
      currentJob?: string
      estimatedTimeRemaining?: number
    }
    completionRate: number
  }
  processor: {
    isActive: boolean
    queueLength: number
    stats: {
      totalProcessed: number
      successRate: number
      averageProcessingTime: number
    }
  }
}

interface LLMProgressMonitorProps {
  sessionId: string
  onComplete?: () => void
  refreshInterval?: number
}

export function LLMProgressMonitor({ 
  sessionId, 
  onComplete, 
  refreshInterval = 3000 
}: LLMProgressMonitorProps) {
  const [progressData, setProgressData] = useState<LLMProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/llm/progress?sessionId=${sessionId}`)
      const result = await response.json()

      if (result.success) {
        setProgressData(result.data)
        setError(null)
        setLastUpdate(new Date())

        // Check if processing is complete
        const { totalJobs, completedJobs, failedJobs } = result.data.session.progress
        if (totalJobs > 0 && (completedJobs + failedJobs) >= totalJobs) {
          onComplete?.()
        }
      } else {
        setError(result.error?.message || 'Failed to fetch progress')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
    const interval = setInterval(fetchProgress, refreshInterval)
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval])

  const formatTime = (ms: number): string => {
    if (!ms || ms <= 0) return 'Unknown'
    
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (isLoading && !progressData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700">Loading LLM processing status...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-600">⚠️ Error: {error}</span>
          <button 
            onClick={fetchProgress}
            className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!progressData) return null

  const { session, processor } = progressData
  const { progress } = session
  const isComplete = progress.totalJobs > 0 && (progress.completedJobs + progress.failedJobs) >= progress.totalJobs

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          LLM Processing Status
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          {!isComplete && (
            <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full"></div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm text-gray-600">
            {progress.completedJobs + progress.failedJobs} / {progress.totalJobs}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.min(session.completionRate, 100)}%` 
            }}
          ></div>
        </div>
        <div className="text-center text-sm text-gray-600">
          {session.completionRate.toFixed(1)}% Complete
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-green-800 font-semibold">{progress.completedJobs}</div>
          <div className="text-green-600 text-sm">Completed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 font-semibold">{progress.failedJobs}</div>
          <div className="text-red-600 text-sm">Failed</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-blue-800 font-semibold">
            {progress.totalJobs - progress.completedJobs - progress.failedJobs}
          </div>
          <div className="text-blue-600 text-sm">Pending</div>
        </div>
      </div>

      {/* Current Job */}
      {progress.currentJob && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-yellow-800">Currently Processing:</div>
              <div className="text-sm text-yellow-700 break-all">{progress.currentJob}</div>
            </div>
          </div>
        </div>
      )}

      {/* Time Estimates */}
      {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-sm text-gray-600">
            Estimated time remaining: <span className="font-medium">
              {formatTime(progress.estimatedTimeRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Processor Stats */}
      <div className="border-t pt-4">
        <div className="text-sm text-gray-600 space-y-1">
          <div>Queue: {processor.queueLength} jobs waiting</div>
          <div>Success rate: {processor.stats.successRate.toFixed(1)}%</div>
          <div>Avg processing time: {formatTime(processor.stats.averageProcessingTime)}</div>
        </div>
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✅</span>
            <div>
              <div className="text-green-800 font-medium">Processing Complete!</div>
              <div className="text-green-600 text-sm">
                {progress.completedJobs} successful, {progress.failedJobs} failed
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}