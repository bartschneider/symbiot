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

// Configuration
const API_BASE_URL = 'http://localhost:3001'; // Firecrawl service port
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Demo credentials for development
const DEMO_CREDENTIALS = {
  username: 'demo',
  password: 'demo123'
};

// Token management
let authToken: string | null = null;
let tokenExpiry: number | null = null;

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

// Authentication functions
async function login(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(DEMO_CREDENTIALS),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (!response.ok) {
    throw new SitemapApiError('Authentication failed', 'AUTH_FAILED', response.status);
  }

  const data = await response.json();
  if (!data.success || !data.data?.token) {
    throw new SitemapApiError('Invalid authentication response', 'AUTH_INVALID');
  }

  authToken = data.data.token;
  // Assume token expires in 23 hours (1 hour buffer)
  tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
  
  return authToken;
}

async function getValidToken(): Promise<string> {
  // Check if we have a valid token
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  // Get a new token
  return await login();
}

// HTTP client wrapper with error handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get authentication token
  const token = await getValidToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
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
  console.log('Sending batch request:', JSON.stringify(request, null, 2));
  const response = await apiRequest<BatchScrapingResult['data']>('/api/convert/batch', {
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

// Export the error class for external use
export { SitemapApiError };