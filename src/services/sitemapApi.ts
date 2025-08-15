import {
  ApiResponse,
  SitemapDiscoveryRequest,
  SitemapDiscoveryResult,
  BatchScrapingRequest,
  BatchScrapingResult,
  ProgressUpdate,
  ConversionRequest,
  ConversionResponse,
  ApiError
} from '@/types/sitemap';

// Configuration - Next.js API routes (Phase 2 implementation)
const API_BASE_URL = '';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Error handling utility
class SitemapApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'SitemapApiError';
  }
}

// HTTP client wrapper with error handling (no auth)
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Request failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        url: url
      });
      throw new SitemapApiError(
        data.error?.message || `HTTP ${response.status}`,
        data.error?.code || 'HTTP_ERROR',
        response.status,
        data.meta?.requestId
      );
    }

    return data;
  } catch (error) {
    if (error instanceof SitemapApiError) {
      throw error;
    }
    
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new SitemapApiError('Request timeout', 'TIMEOUT');
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SitemapApiError('Network error', 'NETWORK_ERROR');
    }
    
    throw new SitemapApiError(
      error instanceof Error ? error.message : 'Unknown error',
      'UNKNOWN_ERROR'
    );
  }
}

// API Functions

/**
 * Discover and categorize links from a website's sitemap
 */
export async function discoverSitemap(
  request: SitemapDiscoveryRequest
): Promise<SitemapDiscoveryResult> {
  const response = await apiRequest<SitemapDiscoveryResult['data']>('/api/sitemap/discover', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to discover sitemap',
      response.error?.code || 'DISCOVERY_FAILED'
    );
  }

  return {
    success: true,
    data: response.data,
    processing: {
      processingTime: 0, // Will be populated by backend
      requestId: response.meta?.requestId || '',
      timestamp: response.meta?.timestamp || new Date().toISOString(),
    }
  };
}

/**
 * Extract content from multiple URLs in batch
 */
export async function batchExtractContent(
  request: BatchScrapingRequest
): Promise<BatchScrapingResult> {
  // console.log('Sending batch request:', JSON.stringify(request, null, 2)); // Disabled to prevent console overflow
  const response = await apiRequest<BatchScrapingResult['data']>('/api/sitemap/batch', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to extract content',
      response.error?.code || 'EXTRACTION_FAILED'
    );
  }

  return {
    success: true,
    data: response.data,
    processing: {
      requestId: response.meta?.requestId || '',
      startTime: response.meta?.timestamp || new Date().toISOString(),
      endTime: new Date().toISOString(),
    }
  };
}

/**
 * Extract content from a single URL
 */
export async function extractContent(
  request: ConversionRequest
): Promise<ConversionResponse> {
  const response = await apiRequest<ConversionResponse>('/api/convert', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to extract content',
      response.error?.code || 'EXTRACTION_FAILED'
    );
  }

  return response.data;
}

/**
 * Get progress updates for a batch operation
 */
export async function getProgress(requestId: string): Promise<ProgressUpdate> {
  const response = await apiRequest<ProgressUpdate>(`/api/progress/${requestId}`, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to get progress',
      response.error?.code || 'PROGRESS_FAILED'
    );
  }

  return response.data;
}

/**
 * Cancel a running batch operation
 */
export async function cancelOperation(requestId: string): Promise<void> {
  const response = await apiRequest(`/api/progress/${requestId}/cancel`, {
    method: 'POST',
  });

  if (!response.success) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to cancel operation',
      response.error?.code || 'CANCEL_FAILED'
    );
  }
}

/**
 * Health check for the sitemap service
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await apiRequest('/api/health', {
      method: 'GET',
    });
    return response.success;
  } catch {
    return false;
  }
}

/**
 * Get service status and capabilities
 */
export async function getServiceInfo(): Promise<{
  version: string;
  capabilities: string[];
  limits: {
    maxConcurrent: number;
    maxUrls: number;
    timeout: number;
  };
}> {
  const response = await apiRequest<{
    version: string;
    capabilities: string[];
    limits: {
      maxConcurrent: number;
      maxUrls: number;
      timeout: number;
    };
  }>('/api/info', {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      'Failed to get service info',
      'SERVICE_INFO_FAILED'
    );
  }

  return response.data;
}

// Progress monitoring with SSE (Server-Sent Events)
export function createProgressStream(
  requestId: string,
  onProgress: (update: ProgressUpdate) => void,
  onError: (error: ApiError) => void,
  onComplete: () => void
): () => void {
  const eventSource = new EventSource(`${API_BASE_URL}/api/progress/${requestId}/stream`);
  
  eventSource.onmessage = (event) => {
    try {
      const update: ProgressUpdate = JSON.parse(event.data);
      onProgress(update);
      
      if (update.status === 'completed' || update.status === 'failed' || update.status === 'cancelled') {
        eventSource.close();
        onComplete();
      }
    } catch (error) {
      onError({
        code: 'PARSE_ERROR',
        message: 'Failed to parse progress update',
      });
    }
  };

  eventSource.onerror = () => {
    onError({
      code: 'STREAM_ERROR',
      message: 'Progress stream connection failed',
    });
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// Utility functions
export function isApiError(error: any): error is SitemapApiError {
  return error instanceof SitemapApiError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export function getErrorCode(error: unknown): string {
  if (isApiError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

// Extraction History API Functions

/**
 * Check if a URL has been extracted before
 */
export async function checkExtractionHistory(url: string): Promise<{
  exists: boolean;
  lastExtracted?: string;
  extractionCount: number;
  lastStatus?: 'success' | 'failed' | 'processing';
  sessionId?: string;
}> {
  const response = await apiRequest<{
    exists: boolean;
    lastExtracted?: string;
    extractionCount: number;
    lastStatus?: 'success' | 'failed' | 'processing';
    sessionId?: string;
  }>(`/api/extraction-history/check?url=${encodeURIComponent(url)}`, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to check extraction history',
      response.error?.code || 'HISTORY_CHECK_FAILED'
    );
  }

  return response.data;
}

/**
 * Get extraction sessions for current user
 */
export async function getExtractionSessions(options: {
  page?: number;
  limit?: number;
  status?: string;
  sourceUrl?: string;
} = {}): Promise<{
  sessions: Array<{
    id: string;
    sessionName: string;
    sourceUrl: string;
    status: string;
    totalUrls: number;
    successfulUrls: number;
    failedUrls: number;
    successRatePercent: number;
    createdAt: string;
    completedAt?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.status) params.append('status', options.status);
  if (options.sourceUrl) params.append('sourceUrl', options.sourceUrl);

  const response = await apiRequest<{
    sessions: any[];
    pagination: any;
  }>(`/api/extraction-history/sessions?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to get extraction sessions',
      response.error?.code || 'SESSIONS_FAILED'
    );
  }

  return response.data;
}

/**
 * Get retryable URLs for current user
 */
export async function getRetryableUrls(options: {
  sessionId?: string;
  errorCode?: string;
  limit?: number;
} = {}): Promise<Array<{
  extractionId: string;
  url: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  sessionId: string;
  sourceUrl: string;
  sessionName: string;
  createdAt: string;
  lastRetryAt?: string;
}>> {
  const params = new URLSearchParams();
  if (options.sessionId) params.append('sessionId', options.sessionId);
  if (options.errorCode) params.append('errorCode', options.errorCode);
  if (options.limit) params.append('limit', options.limit.toString());

  const response = await apiRequest<Array<any>>(`/api/extraction-history/retryable?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to get retryable URLs',
      response.error?.code || 'RETRYABLE_FAILED'
    );
  }

  return response.data;
}

/**
 * Create retry session from failed extractions
 */
export async function createRetrySession(extractionIds: string[], options: {
  sessionName?: string;
} = {}): Promise<{
  session: any;
  extractions: any[];
  originalExtractions: any[];
}> {
  const response = await apiRequest<{
    session: any;
    extractions: any[];
    originalExtractions: any[];
  }>('/api/extraction-history/retry', {
    method: 'POST',
    body: JSON.stringify({
      extractionIds,
      sessionName: options.sessionName
    }),
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to create retry session',
      response.error?.code || 'RETRY_SESSION_FAILED'
    );
  }

  return response.data;
}

/**
 * Get session details with URL extractions
 */
export async function getSessionDetails(sessionId: string): Promise<{
  session: any;
  extractions: any[];
}> {
  const response = await apiRequest<{
    session: any;
    extractions: any[];
  }>(`/api/extraction-history/sessions/${sessionId}`, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new SitemapApiError(
      response.error?.message || 'Failed to get session details',
      response.error?.code || 'SESSION_DETAILS_FAILED'
    );
  }

  return response.data;
}

// Export the error class for external use
export { SitemapApiError };