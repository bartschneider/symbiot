import express from 'express';
import {
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
} from '../controllers/extractionHistory.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

/**
 * Validation middleware for extraction history routes
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * NOTE: Authentication temporarily disabled across all routes.
 * These endpoints are now public. Keep validation intact.
 */

/**
 * GET /api/extraction-history/sessions
 * Get extraction sessions with pagination and filtering
 * Notes:
 * - Supports page (maps to offset internally), limit, status, sourceUrl filters
 */
router.get('/sessions',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('status').optional().isIn(['in_progress', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
    query('sourceUrl').optional().isString().isLength({ min: 1, max: 2000 }).withMessage('sourceUrl must be a string'),
    query('sortBy').optional().isIn(['created_at', 'session_name', 'total_urls', 'success_rate_percent']).withMessage('Invalid sortBy field'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
  ],
  handleValidationErrors,
  getSessions
);

/**
 * POST /api/extraction-history/sessions
 * Create a new extraction session
 */
router.post('/sessions',
  [
    body('sourceUrl').isURL().withMessage('Source URL must be a valid URL'),
    body('sessionName').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Session name must be 1-500 characters'),
    body('totalUrls').optional().isInt({ min: 0 }).withMessage('Total URLs must be a non-negative integer'),
    body('chunkSize').optional().isInt({ min: 1, max: 100 }).withMessage('Chunk size must be between 1 and 100'),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }).withMessage('Max retries must be between 0 and 10')
  ],
  handleValidationErrors,
  createSession
);

/**
 * GET /api/extraction-history/sessions/:sessionId
 * Get detailed session information including URL status breakdown
 */
router.get('/sessions/:sessionId',
  [
    param('sessionId').isUUID().withMessage('Session ID must be a valid UUID')
  ],
  handleValidationErrors,
  getSessionDetail
);

/**
 * PUT /api/extraction-history/sessions/:sessionId
 * Update extraction session status
 */
router.put('/sessions/:sessionId',
  [
    param('sessionId').isUUID().withMessage('Session ID must be a valid UUID'),
    body('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
    body('processingTimeMs').optional().isInt({ min: 0 }).withMessage('Processing time must be a non-negative integer'),
    body('errorMessage').optional().isString().isLength({ max: 1000 }).withMessage('Error message must be less than 1000 characters')
  ],
  handleValidationErrors,
  updateSession
);

/**
 * POST /api/extraction-history/sessions/:sessionId/extractions
 * Create URL extractions for a session
 */
router.post('/sessions/:sessionId/extractions',
  [
    param('sessionId').isUUID().withMessage('Session ID must be a valid UUID'),
    body('urls').isArray({ min: 1 }).withMessage('URLs must be a non-empty array'),
    body('urls.*').isURL().withMessage('Each URL must be valid'),
    body('chunkNumber').optional().isInt({ min: 1 }).withMessage('Chunk number must be a positive integer')
  ],
  handleValidationErrors,
  createExtractions
);

/**
 * PUT /api/extraction-history/extractions/:extractionId
 * Update URL extraction status and results
 */
router.put('/extractions/:extractionId',
  [
    param('extractionId').isUUID().withMessage('Extraction ID must be a valid UUID'),
    body('status').optional().isIn(['pending', 'processing', 'success', 'failed']).withMessage('Invalid status'),
    body('httpStatusCode').optional().isInt({ min: 100, max: 599 }).withMessage('HTTP status code must be between 100-599'),
    body('contentSizeBytes').optional().isInt({ min: 0 }).withMessage('Content size must be non-negative'),
    body('processingTimeMs').optional().isInt({ min: 0 }).withMessage('Processing time must be non-negative'),
    body('errorCode').optional().isString().isLength({ max: 50 }).withMessage('Error code must be less than 50 characters'),
    body('errorMessage').optional().isString().isLength({ max: 1000 }).withMessage('Error message must be less than 1000 characters'),
    body('title').optional().isString().isLength({ max: 500 }).withMessage('Title must be less than 500 characters'),
    body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('imagesCount').optional().isInt({ min: 0 }).withMessage('Images count must be non-negative')
  ],
  handleValidationErrors,
  updateExtraction
);

/**
 * DELETE /api/extraction-history/sessions/:sessionId
 * Delete an extraction session and all related data
 */
router.delete('/sessions/:sessionId',
  [
    param('sessionId').isUUID().withMessage('Session ID must be a valid UUID')
  ],
  handleValidationErrors,
  removeSession
);

/**
 * GET /api/extraction-history/retryable
 * Get failed URLs that can be retried
 */
router.get('/retryable',
  [
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    query('errorType').optional().isLength({ min: 1, max: 100 }).withMessage('Error type must be 1-100 characters'),
    query('sortBy').optional().isIn(['last_error_at', 'url', 'error_type', 'attempt_count']).withMessage('Invalid sortBy field'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
  ],
  handleValidationErrors,
  getRetryableExtractions
);

/**
 * POST /api/extraction-history/retry
 * Create retry session from failed URLs
 */
router.post('/retry',
  [
    body('extractionIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('extractionIds must be an array with 1-100 items'),
    body('extractionIds.*')
      .isUUID()
      .withMessage('Each extraction ID must be a valid UUID'),
    body('sessionName')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Session name must be 1-255 characters'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object')
  ],
  handleValidationErrors,
  createRetrySessionFromIds
);

/**
 * GET /api/extraction-history/analytics
 * Get extraction analytics and performance metrics
 */
router.get('/analytics',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 date'),
    query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('groupBy must be day, week, or month')
  ],
  handleValidationErrors,
  getExtractionAnalytics
);

/**
 * GET /api/extraction-history/patterns
 * Get URL pattern statistics
 */
router.get('/patterns',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  getPatternStatistics
);

/**
 * GET /api/extraction-history/errors
 * Get error analysis and patterns
 */
router.get('/errors',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  getPatternStatistics // Using pattern stats instead of error analysis
);

/**
 * GET /api/extraction-history/health
 * Database health check endpoint
 */
router.get('/health', getDatabaseHealth);

/**
 * GET /api/extraction-history/check
 * Check if a URL was previously extracted
 * Query: url (required)
 */
router.get('/check',
  [
    query('url').isURL().withMessage('url must be a valid URL')
  ],
  handleValidationErrors,
  async (req, res) => {
    const t0 = Date.now();
    try {
      const { url } = req.query;

      // Normalize URL to canonical form to reduce mismatches
      let normalizedUrl = String(url).trim();
      try {
        const u = new URL(normalizedUrl);
        // Drop fragments and default ports; keep query string
        u.hash = '';
        if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
          u.port = '';
        }
        normalizedUrl = u.toString();
      } catch {
        // If URL constructor fails despite validator, fallback to original string
      }

      // Prefer using LIKE search to handle mixed storage (absolute vs canonicalized URLs)
      const { query } = await import('../services/database.js');

      const latestQuery = `
        SELECT
          ue.id as extraction_id,
          ue.status,
          COALESCE(ue.processed_at, ue.updated_at, ue.created_at) AS processed_at,
          ue.session_id
        FROM url_extractions ue
        WHERE ue.url = $1
        ORDER BY COALESCE(ue.processed_at, ue.updated_at, ue.created_at) DESC
        LIMIT 1
      `;

      const fallbackLatestQuery = `
        SELECT
          ue.id as extraction_id,
          ue.status,
          COALESCE(ue.processed_at, ue.updated_at, ue.created_at) AS processed_at,
          ue.session_id
        FROM url_extractions ue
        WHERE ue.url LIKE $1
        ORDER BY COALESCE(ue.processed_at, ue.updated_at, ue.created_at) DESC
        LIMIT 1
      `;

      const countQuery = `
        SELECT COUNT(*)::int AS cnt
        FROM url_extractions
        WHERE url = $1
      `;

      const fallbackCountQuery = `
        SELECT COUNT(*)::int AS cnt
        FROM url_extractions
        WHERE url LIKE $1
      `;

      // Try exact match first
      let latestRes = await query(latestQuery, [normalizedUrl]);
      let countRes = await query(countQuery, [normalizedUrl]);

      // If nothing found, fallback to LIKE on canonical host/path without trailing slash variance
      if ((latestRes.rows?.length ?? 0) === 0 && (countRes.rows?.[0]?.cnt ?? 0) === 0) {
        // Build a LIKE pattern that tolerates minor variations (trailing slash)
        let pattern = normalizedUrl;
        if (!pattern.endsWith('/')) pattern = `${pattern}%`;
        latestRes = await query(fallbackLatestQuery, [pattern]);
        countRes = await query(fallbackCountQuery, [pattern]);
      }

      const latest = latestRes.rows?.[0] || null;
      const extractionCount = countRes.rows?.[0]?.cnt || 0;

      const payload = {
        exists: !!latest || extractionCount > 0,
        lastExtracted: latest?.processed_at ? new Date(latest.processed_at).toISOString() : undefined,
        extractionCount,
        lastStatus: latest?.status || undefined,
        sessionId: latest?.session_id || undefined
      };

      res.json({
        success: true,
        data: payload,
        meta: { ms: Date.now() - t0 }
      });
    } catch (err) {
      console.error('[HISTORY_CHECK] Failed:', err?.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_CHECK_FAILED',
          message: 'Failed to check extraction history'
        }
      });
    }
  }
);

export default router;