import {
  createExtractionSession,
  updateExtractionSession,
  createUrlExtractions,
  updateUrlExtraction,
  getUserSessions,
  getSessionDetails,
  getRetryableUrls,
  createRetrySession,
  updateRetryAttempt,
  getAnalytics,
  deleteSession,
  getUrlPatternStats
} from '../services/extractionHistory.js';
import { healthCheck } from '../services/database.js';

/**
 * Extraction History API Controllers
 * Handles HTTP requests for extraction history and retry functionality
 */

/**
 * Get user's extraction sessions with pagination and filtering
 */
export const getSessions = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      page = 1,
      limit = 20,
      status,
      sourceUrl,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = req.query;

    const result = await getUserSessions(userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Cap limit at 100
      status,
      sourceUrl,
      orderBy,
      orderDirection
    });

    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch extraction sessions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get detailed session information with extractions
 */
export const getSessionDetail = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await getSessionDetails(sessionId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch session details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get retryable URLs for a user
 */
export const getRetryableExtractions = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      sessionId,
      errorCode,
      limit = 100,
      minRetryInterval = 300000 // 5 minutes
    } = req.query;

    const retryableUrls = await getRetryableUrls(userId, {
      sessionId,
      errorCode,
      limit: Math.min(parseInt(limit), 500), // Cap at 500
      minRetryInterval: parseInt(minRetryInterval)
    });

    res.json({
      success: true,
      data: retryableUrls
    });
  } catch (error) {
    console.error('Error fetching retryable URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch retryable URLs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create retry session from failed extractions
 */
export const createRetrySessionFromIds = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { extractionIds, sessionName, retryStrategy = 'manual' } = req.body;

    if (!extractionIds || !Array.isArray(extractionIds) || extractionIds.length === 0) {
      return res.status(400).json({ error: 'Extraction IDs array is required' });
    }

    const result = await createRetrySession(userId, extractionIds, {
      sessionName,
      retryStrategy
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating retry session:', error);
    
    if (error.message.includes('No retryable URLs found')) {
      return res.status(400).json({
        success: false,
        error: 'No retryable URLs found for the provided extraction IDs'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create retry session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get analytics data for user's extractions
 */
export const getExtractionAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      dateFrom,
      dateTo,
      groupBy = 'day'
    } = req.query;

    if (groupBy && !['day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({ error: 'groupBy must be one of: day, week, month' });
    }

    const analytics = await getAnalytics(userId, {
      dateFrom,
      dateTo,
      groupBy
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new extraction session
 */
export const createSession = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sourceUrl, sessionName, totalUrls, chunkSize = 25, maxRetries = 3 } = req.body;

    if (!sourceUrl) {
      return res.status(400).json({ error: 'Source URL is required' });
    }

    const session = await createExtractionSession(userId, sourceUrl, {
      sessionName,
      totalUrls: totalUrls || 0,
      chunkSize,
      maxRetries
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create extraction session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update extraction session status
 */
export const updateSession = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { status, processingTimeMs, errorMessage } = req.body;

    const session = await updateExtractionSession(sessionId, {
      status,
      processingTimeMs,
      errorMessage
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update extraction session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create URL extractions for a session
 */
export const createExtractions = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { urls, chunkNumber = 1 } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    const extractions = await createUrlExtractions(sessionId, urls, chunkNumber);

    res.status(201).json({
      success: true,
      data: extractions
    });
  } catch (error) {
    console.error('Error creating extractions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create URL extractions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update URL extraction status and results
 */
export const updateExtraction = async (req, res) => {
  try {
    const { extractionId } = req.params;

    if (!extractionId) {
      return res.status(400).json({ error: 'Extraction ID is required' });
    }

    const {
      status,
      httpStatusCode,
      contentSizeBytes,
      processingTimeMs,
      errorCode,
      errorMessage,
      markdownContent,
      title,
      description,
      imagesCount
    } = req.body;

    const extraction = await updateUrlExtraction(extractionId, {
      status,
      httpStatusCode,
      contentSizeBytes,
      processingTimeMs,
      errorCode,
      errorMessage,
      markdownContent,
      title,
      description,
      imagesCount
    });

    if (!extraction) {
      return res.status(404).json({
        success: false,
        error: 'Extraction not found'
      });
    }

    res.json({
      success: true,
      data: extraction
    });
  } catch (error) {
    console.error('Error updating extraction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update URL extraction',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get URL pattern statistics
 */
export const getPatternStatistics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { limit = 10 } = req.query;

    const stats = await getUrlPatternStats(userId, {
      limit: Math.min(parseInt(limit), 50) // Cap at 50
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching pattern statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch URL pattern statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete extraction session
 */
export const removeSession = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const deletedSession = await deleteSession(sessionId, userId);

    if (!deletedSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully',
      data: deletedSession
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Database health check endpoint
 */
export const getDatabaseHealth = async (req, res) => {
  try {
    const health = await healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Database health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getSessions,
  getSessionDetail,
  createSession,
  updateSession,
  createExtractions,
  updateExtraction,
  getRetryableExtractions,
  createRetrySessionFromIds,
  getExtractionAnalytics,
  removeSession,
  getPatternStatistics,
  getDatabaseHealth
};