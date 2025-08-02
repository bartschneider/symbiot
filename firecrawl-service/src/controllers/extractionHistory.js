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

const isDev = () => (process.env.NODE_ENV !== 'production');
const log = (event, ctx = {}) => {
  if (!isDev()) return;
  try {
    const safe = JSON.stringify(ctx, (_, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v));
    console.log(`[EXTRACT-CTRL] ${event} ${safe}`);
  } catch {
    console.log(`[EXTRACT-CTRL] ${event}`, ctx);
  }
};

/**
 * Extraction History API Controllers
 * Handles HTTP requests for extraction history and retry functionality
 */

/**
 * Get user's extraction sessions with pagination and filtering
 */
export const getSessions = async (req, res) => {
  try {
    // Auth disabled: allow anonymous access, default to a shared context
    const userId = req.user?.id || req.user?.userId || null;
    log('getSessions:start', {
      method: req.method,
      path: req.originalUrl || req.url,
      userId,
      hasUser: !!req.user
    });

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

    log('getSessions:success', {
      count: result.sessions?.length,
      pagination: result.pagination
    });

    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination
    });
  } catch (error) {
    log('getSessions:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;
    const { sessionId } = req.params;
    log('getSessionDetail:start', { userId, sessionId });

    if (!sessionId) {
      log('getSessionDetail:missing-sessionId');
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await getSessionDetails(sessionId, userId);
    log('getSessionDetail:success', {
      extractions: result?.extractions?.length,
      hasSession: !!result?.session
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log('getSessionDetail:error', { message: error.message });
    
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
    const userId = req.user?.id || req.user?.userId || null;
    log('getRetryableExtractions:start', { userId });

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

    log('getRetryableExtractions:success', { count: retryableUrls?.length });

    res.json({
      success: true,
      data: retryableUrls
    });
  } catch (error) {
    log('getRetryableExtractions:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;

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
    const userId = req.user?.id || req.user?.userId || null;

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
    const userId = req.user?.id || req.user?.userId || null;
    log('createSession:start', { userId });

    const { sourceUrl, sessionName, totalUrls, chunkSize = 25, maxRetries = 3 } = req.body;

    if (!sourceUrl) {
      log('createSession:missing-sourceUrl');
      return res.status(400).json({ error: 'Source URL is required' });
    }

    const session = await createExtractionSession(userId, sourceUrl, {
      sessionName,
      totalUrls: totalUrls || 0,
      chunkSize,
      maxRetries
    });

    log('createSession:success', { sessionId: session?.id });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    log('createSession:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;
    const { sessionId } = req.params;
    log('updateSession:start', { userId, sessionId });

    const { status, processingTimeMs, errorMessage } = req.body;

    const session = await updateExtractionSession(sessionId, {
      status,
      processingTimeMs,
      errorMessage
    });

    if (!session) {
      log('updateSession:not-found', { sessionId });
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    log('updateSession:success', { sessionId });

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    log('updateSession:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;
    const { sessionId } = req.params;
    log('createExtractions:start', { userId, sessionId });

    const { urls, chunkNumber = 1 } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      log('createExtractions:invalid-urls');
      return res.status(400).json({ error: 'URLs array is required' });
    }

    const extractions = await createUrlExtractions(sessionId, urls, chunkNumber);
    log('createExtractions:success', { created: extractions?.length });

    res.status(201).json({
      success: true,
      data: extractions
    });
  } catch (error) {
    log('createExtractions:error', { message: error.message });
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
    log('updateExtraction:start', { extractionId });

    if (!extractionId) {
      log('updateExtraction:missing-id');
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
      log('updateExtraction:not-found', { extractionId });
      return res.status(404).json({
        success: false,
        error: 'Extraction not found'
      });
    }

    log('updateExtraction:success', { extractionId, status: extraction?.status });

    res.json({
      success: true,
      data: extraction
    });
  } catch (error) {
    log('updateExtraction:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;
    log('getPatternStatistics:start', { userId });

    const { limit = 10 } = req.query;

    const stats = await getUrlPatternStats(userId, {
      limit: Math.min(parseInt(limit), 50) // Cap at 50
    });

    log('getPatternStatistics:success', { count: stats?.length });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    log('getPatternStatistics:error', { message: error.message });
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
    const userId = req.user?.id || req.user?.userId || null;
    const { sessionId } = req.params;
    log('removeSession:start', { userId, sessionId });

    const deletedSession = await deleteSession(sessionId, userId);

    if (!deletedSession) {
      log('removeSession:not-found', { sessionId });
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    log('removeSession:success', { sessionId });

    res.json({
      success: true,
      message: 'Session deleted successfully',
      data: deletedSession
    });
  } catch (error) {
    log('removeSession:error', { message: error.message });
    
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
    log('getDatabaseHealth:success', { healthy: !!health?.healthy });

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    log('getDatabaseHealth:error', { message: error.message });
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