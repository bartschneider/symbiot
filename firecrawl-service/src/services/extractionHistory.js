import { query, transaction, buildWhereClause, buildPaginationClause } from './database.js';

/**
 * Extraction History Service
 * Handles all database operations for tracking sitemap extraction history
 */

/**
 * Create a new extraction session
 */
export const createExtractionSession = async (userId, sourceUrl, options = {}) => {
  const {
    sessionName,
    totalUrls = 0,
    chunkSize = 25,
    maxRetries = 3
  } = options;

  const sessionQuery = `
    INSERT INTO extraction_sessions (
      user_id, session_name, source_url, total_urls, 
      chunk_size, max_retries, status, started_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, 'processing', NOW())
    RETURNING *
  `;

  try {
    const result = await query(sessionQuery, [
      userId,
      sessionName || `Extraction - ${new Date().toISOString().split('T')[0]}`,
      sourceUrl,
      totalUrls,
      chunkSize,
      maxRetries
    ]);

    return result.rows[0];
  } catch (error) {
    // Enhanced error context for debugging
    const context = {
      operation: 'createExtractionSession',
      userId,
      sourceUrl,
      sessionName: sessionName || 'auto-generated',
      totalUrls,
      chunkSize,
      maxRetries
    };

    if (error.code === '23505') {
      throw new Error(`Duplicate extraction session detected. Session with same parameters already exists for user ${userId}. Context: ${JSON.stringify(context)}`);
    } else if (error.code === '23503') {
      throw new Error(`Database constraint violation: Invalid user ID ${userId} or foreign key constraint failed. Ensure user exists before creating session. Context: ${JSON.stringify(context)}`);
    } else if (error.code === '23514') {
      throw new Error(`Invalid session parameters: Check constraints failed (e.g., totalUrls, chunkSize, maxRetries must be positive). Context: ${JSON.stringify(context)}`);
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error(`Database connection failed while creating extraction session. Please retry. Original error: ${error.message}. Context: ${JSON.stringify(context)}`);
    } else {
      throw new Error(`Failed to create extraction session: ${error.message}. Context: ${JSON.stringify(context)}`);
    }
  }
};

/**
 * Update extraction session status and completion
 */
export const updateExtractionSession = async (sessionId, updates) => {
  const {
    status,
    processingTimeMs,
    errorMessage,
    completedAt = new Date()
  } = updates;

  const updateQuery = `
    UPDATE extraction_sessions 
    SET 
      status = COALESCE($2, status),
      processing_time_ms = COALESCE($3, processing_time_ms),
      error_message = COALESCE($4, error_message),
      completed_at = COALESCE($5, completed_at),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(updateQuery, [
    sessionId,
    status,
    processingTimeMs,
    errorMessage,
    completedAt
  ]);

  return result.rows[0];
};

/**
 * Create URL extraction records in batch
 */
export const createUrlExtractions = async (sessionId, urls, chunkNumber = 1) => {
  if (!urls || urls.length === 0) {
    return [];
  }

  if (!Array.isArray(urls)) {
    throw new Error(`Invalid URLs format: Expected array, got ${typeof urls}. Please provide URLs as an array.`);
  }

  if (!sessionId || isNaN(parseInt(sessionId))) {
    throw new Error(`Invalid session ID: Expected numeric session ID, got ${sessionId}. Ensure session exists before creating URL extractions.`);
  }

  try {
    // Validate URLs
    const invalidUrls = urls.filter(url => !url || typeof url !== 'string' || url.trim() === '');
    if (invalidUrls.length > 0) {
      throw new Error(`Invalid URLs detected: ${invalidUrls.length} empty or invalid URLs found. All URLs must be non-empty strings.`);
    }

    // Prepare batch insert
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    urls.forEach((url, index) => {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(sessionId, url.trim(), chunkNumber, index + 1);
    });

    const insertQuery = `
      INSERT INTO url_extractions (session_id, url, chunk_number, sequence_number)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await query(insertQuery, values);
    return result.rows;
  } catch (error) {
    const context = {
      operation: 'createUrlExtractions',
      sessionId,
      urlCount: urls.length,
      chunkNumber,
      sampleUrls: urls.slice(0, 3) // Show first 3 URLs for debugging
    };

    if (error.message.includes('Invalid URLs') || error.message.includes('Invalid session ID')) {
      throw error; // Re-throw our custom validation errors
    } else if (error.code === '23503') {
      throw new Error(`Foreign key constraint violation: Session ID ${sessionId} does not exist. Ensure the extraction session is created before adding URLs. Context: ${JSON.stringify(context)}`);
    } else if (error.code === '23505') {
      throw new Error(`Duplicate URL extraction detected: One or more URLs in this batch already exist for session ${sessionId} with the same chunk/sequence numbers. Context: ${JSON.stringify(context)}`);
    } else if (error.code === '22001') {
      throw new Error(`Data too long: One or more URLs exceed the maximum length limit. Check URL lengths and database schema constraints. Context: ${JSON.stringify(context)}`);
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error(`Database connection failed while creating URL extractions. Please retry. Original error: ${error.message}. Context: ${JSON.stringify(context)}`);
    } else {
      throw new Error(`Failed to create URL extractions: ${error.message}. Context: ${JSON.stringify(context)}`);
    }
  }
};

/**
 * Update URL extraction status and results
 */
export const updateUrlExtraction = async (extractionId, updates) => {
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
    imagesCount = 0,
    processedAt = new Date()
  } = updates;

  const updateQuery = `
    UPDATE url_extractions 
    SET 
      status = COALESCE($2, status),
      http_status_code = COALESCE($3, http_status_code),
      content_size_bytes = COALESCE($4, content_size_bytes),
      processing_time_ms = COALESCE($5, processing_time_ms),
      error_code = COALESCE($6, error_code),
      error_message = COALESCE($7, error_message),
      markdown_content = COALESCE($8, markdown_content),
      title = COALESCE($9, title),
      description = COALESCE($10, description),
      images_count = COALESCE($11, images_count),
      processed_at = COALESCE($12, processed_at),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(updateQuery, [
    extractionId,
    status,
    httpStatusCode,
    contentSizeBytes,
    processingTimeMs,
    errorCode,
    errorMessage,
    markdownContent,
    title,
    description,
    imagesCount,
    processedAt
  ]);

  return result.rows[0];
};

/**
 * Get extraction sessions for a user with pagination
 */
export const getUserSessions = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    sourceUrl,
    orderBy = 'created_at',
    orderDirection = 'DESC'
  } = options;

  const filters = { user_id: userId };
  if (status) filters.status = status;
  if (sourceUrl) filters.source_url = `%${sourceUrl}%`;

  const { clause: whereClause, values } = buildWhereClause(filters);
  const { clause: paginationClause } = buildPaginationClause(page, limit);

  const sessionsQuery = `
    SELECT 
      s.*,
      ROUND(
        CASE 
          WHEN s.total_urls > 0 THEN (s.successful_urls::FLOAT / s.total_urls * 100)
          ELSE 0 
        END, 2
      ) AS success_rate_percent
    FROM extraction_sessions s
    ${whereClause}
    ORDER BY ${orderBy} ${orderDirection}
    ${paginationClause}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM extraction_sessions s
    ${whereClause}
  `;

  const [sessions, count] = await Promise.all([
    query(sessionsQuery, values),
    query(countQuery, values)
  ]);

  return {
    sessions: sessions.rows,
    pagination: {
      total: parseInt(count.rows[0].total),
      page,
      limit,
      pages: Math.ceil(count.rows[0].total / limit)
    }
  };
};

/**
 * Get detailed session information with URL extractions
 */
export const getSessionDetails = async (sessionId, userId) => {
  try {
    // Get session information
    const sessionQuery = `
      SELECT * FROM session_statistics 
      WHERE id = $1 AND user_id = $2
    `;

    const sessionResult = await query(sessionQuery, [sessionId, userId]);
    
    if (sessionResult.rows.length === 0) {
      throw new Error(`Session not found: No extraction session with ID ${sessionId} exists for user ${userId}. This could indicate the session was deleted, belongs to another user, or the session ID is invalid.`);
    }

    // Get URL extractions
    const extractionsQuery = `
      SELECT 
        id, url, chunk_number, sequence_number, status,
        http_status_code, content_size_bytes, processing_time_ms,
        error_code, error_message, title, description,
        images_count, retry_count, created_at, processed_at
      FROM url_extractions 
      WHERE session_id = $1
      ORDER BY chunk_number, sequence_number
    `;

    const extractionsResult = await query(extractionsQuery, [sessionId]);

    return {
      session: sessionResult.rows[0],
      extractions: extractionsResult.rows
    };
  } catch (error) {
    const context = {
      operation: 'getSessionDetails',
      sessionId,
      userId
    };

    if (error.message.includes('Session not found')) {
      throw error; // Re-throw our custom error
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error(`Database connection timeout while retrieving session ${sessionId}. Please retry. Context: ${JSON.stringify(context)}`);
    } else if (error.code === '42P01') {
      throw new Error(`Database schema error: Table 'session_statistics' or 'url_extractions' does not exist. Database migration may be required. Context: ${JSON.stringify(context)}`);
    } else {
      throw new Error(`Failed to retrieve session details: ${error.message}. Context: ${JSON.stringify(context)}`);
    }
  }
};

/**
 * Get retryable URLs for a user
 */
export const getRetryableUrls = async (userId, options = {}) => {
  const {
    sessionId,
    errorCode,
    limit = 100,
    minRetryInterval = 300000 // 5 minutes default
  } = options;

  let filters = `r.user_id = $1`;
  const values = [userId];
  let paramIndex = 2;

  if (sessionId) {
    filters += ` AND r.session_id = $${paramIndex++}`;
    values.push(sessionId);
  }

  if (errorCode) {
    filters += ` AND r.error_code = $${paramIndex++}`;
    values.push(errorCode);
  }

  // Add minimum retry interval filter
  filters += ` AND (r.last_retry_at IS NULL OR r.last_retry_at < NOW() - INTERVAL '${minRetryInterval} milliseconds')`;

  const retryableQuery = `
    SELECT 
      r.extraction_id,
      r.url,
      r.error_code,
      r.error_message,
      r.retry_count,
      r.session_id,
      r.source_url,
      r.session_name,
      r.retry_attempts,
      r.created_at,
      r.last_retry_at
    FROM retryable_urls r
    WHERE ${filters}
    ORDER BY r.created_at DESC
    LIMIT $${paramIndex}
  `;

  values.push(limit);

  const result = await query(retryableQuery, values);
  return result.rows;
};

/**
 * Create retry session from failed URLs
 */
export const createRetrySession = async (userId, extractionIds, options = {}) => {
  const {
    sessionName = `Retry Session - ${new Date().toISOString().split('T')[0]}`,
    retryStrategy = 'manual'
  } = options;

  if (!extractionIds || extractionIds.length === 0) {
    throw new Error('No extraction IDs provided for retry: extractionIds array is empty or undefined. Please provide valid extraction IDs to retry.');
  }

  if (!Array.isArray(extractionIds)) {
    throw new Error(`Invalid extractionIds format: Expected array, got ${typeof extractionIds}. Please provide extraction IDs as an array.`);
  }

  try {
    // Get details of URLs to retry
    const urlsQuery = `
      SELECT ue.id, ue.url, ue.session_id, es.source_url, ue.error_code, ue.error_message
      FROM url_extractions ue
      JOIN extraction_sessions es ON ue.session_id = es.id
      WHERE ue.id = ANY($1) AND es.user_id = $2 AND ue.status = 'failed'
    `;

    const urlsResult = await query(urlsQuery, [extractionIds, userId]);
    
    if (urlsResult.rows.length === 0) {
      throw new Error(`No retryable URLs found: None of the provided extraction IDs [${extractionIds.join(', ')}] correspond to failed extractions for user ${userId}. This could mean: 1) Extraction IDs don't exist, 2) Extractions don't belong to this user, 3) Extractions are not in 'failed' status, or 4) Extractions have already been successfully retried.`);
    }

    if (urlsResult.rows.length !== extractionIds.length) {
      const foundIds = urlsResult.rows.map(row => row.id);
      const missingIds = extractionIds.filter(id => !foundIds.includes(id));
      console.warn(`Warning: Some extraction IDs were not found or not retryable: ${missingIds.join(', ')}`);
    }

    // Use the source URL from the first extraction
    const sourceUrl = urlsResult.rows[0].source_url;

    // Create new retry session
    const retrySession = await createExtractionSession(userId, sourceUrl, {
      sessionName,
      totalUrls: urlsResult.rows.length,
      chunkSize: 25,
      maxRetries: 3
    });

    // Create retry records with actual error information
    const retryQueries = urlsResult.rows.map((url, index) => ({
      text: `
        INSERT INTO extraction_retries (
          original_extraction_id, retry_session_id, attempt_number,
          previous_error_code, previous_error_message, retry_strategy
        )
        SELECT 
          $1, $2, COALESCE(MAX(attempt_number), 0) + 1, $3, $4, $5
        FROM extraction_retries 
        WHERE original_extraction_id = $1
      `,
      params: [
        url.id,
        retrySession.id,
        url.error_code || 'UNKNOWN_ERROR',
        url.error_message || 'No error message available',
        retryStrategy
      ]
    }));

    // Create URL extractions for retry
    const urls = urlsResult.rows.map(row => row.url);
    const urlExtractions = await createUrlExtractions(retrySession.id, urls);

    // Execute retry record creation in transaction
    await transaction(retryQueries);

    return {
      session: retrySession,
      extractions: urlExtractions,
      originalExtractions: urlsResult.rows
    };
  } catch (error) {
    const context = {
      operation: 'createRetrySession',
      userId,
      extractionIds,
      sessionName,
      retryStrategy,
      extractionCount: extractionIds.length
    };

    if (error.message.includes('No retryable URLs found') || error.message.includes('No extraction IDs provided')) {
      throw error; // Re-throw our custom validation errors
    } else if (error.code === '23503') {
      throw new Error(`Database foreign key constraint failed while creating retry session. This might indicate invalid user ID ${userId} or corrupted extraction references. Context: ${JSON.stringify(context)}`);
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error(`Database connection failed while creating retry session. Please retry operation. Original error: ${error.message}. Context: ${JSON.stringify(context)}`);
    } else {
      throw new Error(`Failed to create retry session: ${error.message}. Context: ${JSON.stringify(context)}`);
    }
  }
};

/**
 * Update retry attempt status
 */
export const updateRetryAttempt = async (retryId, status, updates = {}) => {
  const {
    errorCode,
    errorMessage,
    processingTimeMs,
    completedAt = new Date()
  } = updates;

  const updateQuery = `
    UPDATE extraction_retries 
    SET 
      status = $2,
      error_code = COALESCE($3, error_code),
      error_message = COALESCE($4, error_message),
      processing_time_ms = COALESCE($5, processing_time_ms),
      completed_at = COALESCE($6, completed_at)
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(updateQuery, [
    retryId,
    status,
    errorCode,
    errorMessage,
    processingTimeMs,
    completedAt
  ]);

  return result.rows[0];
};

/**
 * Get analytics data for extractions
 */
export const getAnalytics = async (userId, options = {}) => {
  const {
    dateFrom,
    dateTo,
    groupBy = 'day' // day, week, month
  } = options;

  let dateFilter = '';
  const values = [userId];
  let paramIndex = 2;

  if (dateFrom) {
    dateFilter += ` AND created_at >= $${paramIndex++}`;
    values.push(dateFrom);
  }

  if (dateTo) {
    dateFilter += ` AND created_at <= $${paramIndex++}`;
    values.push(dateTo);
  }

  // Time series data
  const timeSeriesQuery = `
    SELECT 
      DATE_TRUNC('${groupBy}', created_at) as period,
      COUNT(*) as total_sessions,
      SUM(total_urls) as total_urls,
      SUM(successful_urls) as successful_urls,
      SUM(failed_urls) as failed_urls,
      ROUND(AVG(
        CASE 
          WHEN total_urls > 0 THEN (successful_urls::FLOAT / total_urls * 100)
          ELSE 0 
        END
      ), 2) as avg_success_rate,
      AVG(processing_time_ms) as avg_processing_time
    FROM extraction_sessions
    WHERE user_id = $1 ${dateFilter}
    GROUP BY DATE_TRUNC('${groupBy}', created_at)
    ORDER BY period DESC
    LIMIT 30
  `;

  // Error analysis
  const errorAnalysisQuery = `
    SELECT 
      error_code,
      COUNT(*) as count,
      ROUND((COUNT(*)::FLOAT / SUM(COUNT(*)) OVER ()) * 100, 2) as percentage
    FROM url_extractions ue
    JOIN extraction_sessions es ON ue.session_id = es.id
    WHERE es.user_id = $1 AND ue.status = 'failed' AND ue.error_code IS NOT NULL ${dateFilter}
    GROUP BY error_code
    ORDER BY count DESC
    LIMIT 10
  `;

  // Overall statistics
  const overallStatsQuery = `
    SELECT 
      COUNT(*) as total_sessions,
      SUM(total_urls) as total_urls_processed,
      SUM(successful_urls) as total_successful,
      SUM(failed_urls) as total_failed,
      ROUND(
        CASE 
          WHEN SUM(total_urls) > 0 THEN (SUM(successful_urls)::FLOAT / SUM(total_urls) * 100)
          ELSE 0 
        END, 2
      ) as overall_success_rate,
      ROUND(AVG(processing_time_ms), 0) as avg_processing_time,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions
    FROM extraction_sessions
    WHERE user_id = $1 ${dateFilter}
  `;

  const [timeSeries, errorAnalysis, overallStats] = await Promise.all([
    query(timeSeriesQuery, values),
    query(errorAnalysisQuery, values),
    query(overallStatsQuery, values)
  ]);

  return {
    timeSeries: timeSeries.rows,
    errorAnalysis: errorAnalysis.rows,
    overallStats: overallStats.rows[0] || {
      total_sessions: 0,
      total_urls_processed: 0,
      total_successful: 0,
      total_failed: 0,
      overall_success_rate: 0,
      avg_processing_time: 0,
      completed_sessions: 0,
      failed_sessions: 0
    }
  };
};

/**
 * Delete extraction session and all related data
 */
export const deleteSession = async (sessionId, userId) => {
  // Verify ownership
  const verifyQuery = `
    SELECT id FROM extraction_sessions 
    WHERE id = $1 AND user_id = $2
  `;

  const verifyResult = await query(verifyQuery, [sessionId, userId]);
  
  if (verifyResult.rows.length === 0) {
    throw new Error('Session not found or access denied');
  }

  // Delete session (cascade will handle related records)
  const deleteQuery = `
    DELETE FROM extraction_sessions 
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  const result = await query(deleteQuery, [sessionId, userId]);
  return result.rows[0];
};

/**
 * Get extraction statistics by URL patterns
 */
export const getUrlPatternStats = async (userId, options = {}) => {
  const { limit = 10 } = options;

  const statsQuery = `
    SELECT 
      CASE 
        WHEN url ~ '^https?://[^/]+/$' THEN 'homepage'
        WHEN url ~ '/blog/' THEN 'blog'
        WHEN url ~ '/product/' THEN 'product'
        WHEN url ~ '/category/' THEN 'category'
        WHEN url ~ '\\.(pdf|doc|docx|zip)$' THEN 'document'
        ELSE 'other'
      END as url_pattern,
      COUNT(*) as total_extractions,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      ROUND(
        COUNT(CASE WHEN status = 'success' THEN 1 END)::FLOAT / COUNT(*) * 100, 2
      ) as success_rate,
      AVG(processing_time_ms) as avg_processing_time
    FROM url_extractions ue
    JOIN extraction_sessions es ON ue.session_id = es.id
    WHERE es.user_id = $1
    GROUP BY url_pattern
    ORDER BY total_extractions DESC
    LIMIT $2
  `;

  const result = await query(statsQuery, [userId, limit]);
  return result.rows;
};

export default {
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
};