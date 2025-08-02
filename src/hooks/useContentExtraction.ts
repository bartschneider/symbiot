import { useState, useCallback, useRef, useEffect } from 'react';
import {
  batchExtractContent,
  extractContent,
  cancelOperation,
  createProgressStream,
  isApiError,
  getErrorMessage
} from '@/services/sitemapApi';
import {
  BatchScrapingRequest,
  BatchScrapingResult,
  ConversionRequest,
  ConversionResponse,
  ScrapingResult,
  ProgressUpdate,
  ApiError
} from '@/types/sitemap';

interface UseContentExtractionState {
  loading: boolean;
  results: ScrapingResult[];
  progress: ProgressUpdate | null;
  error: ApiError | null;
  requestId: string | null;
  failedUrls: string[];
}

interface UseContentExtractionOptions {
  maxConcurrent?: number;
  defaultOptions?: {
    includeImages?: boolean;
    includeTables?: boolean;
    removeCodeBlocks?: boolean;
    waitForLoad?: number;
  };
  onSuccess?: (result: BatchScrapingResult | ConversionResponse) => void;
  onError?: (error: ApiError) => void;
  onProgress?: (progress: ProgressUpdate) => void;
}

export function useContentExtraction(options: UseContentExtractionOptions = {}) {
  const {
    maxConcurrent = 5,
    defaultOptions = {
      includeImages: true,
      includeTables: true,
      removeCodeBlocks: false,
      waitForLoad: 2000
    },
    onSuccess,
    onError,
    onProgress
  } = options;

  const [state, setState] = useState<UseContentExtractionState>({
    loading: false,
    results: [],
    progress: null,
    error: null,
    requestId: null,
    failedUrls: []
  });

  const progressStreamCleanupRef = useRef<(() => void) | null>(null);
  const lastRequestRef = useRef<BatchScrapingRequest | null>(null);

  /**
   * Extract content from a single URL
   */
  const extractSingle = useCallback(async (request: ConversionRequest): Promise<ConversionResponse> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const result = await extractContent(request);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: null
      }));

      onSuccess?.(result);
      return result;
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
        failedUrls: []
      }));

      onError?.(apiError);
      throw apiError;
    }
  }, [onSuccess, onError]);

  /**
   * Extract content from multiple URLs in batch with automatic chunking
   */
  const batchExtract = useCallback(async (request: BatchScrapingRequest): Promise<BatchScrapingResult> => {
    // Clean up any existing progress stream
    if (progressStreamCleanupRef.current) {
      progressStreamCleanupRef.current();
      progressStreamCleanupRef.current = null;
    }

    const requestId = `batch-${Date.now()}`;
    lastRequestRef.current = request;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      requestId,
      progress: null,
      results: []
    }));

    try {
      const CHUNK_SIZE = 25; // Backend validation limit
      const urls = request.urls;
      
      // If URLs fit in a single batch, process normally
      if (urls.length <= CHUNK_SIZE) {
        const mergedRequest: BatchScrapingRequest = {
          ...request,
          options: {
            ...defaultOptions,
            maxConcurrent,
            ...request.options
          }
        };

        const result = await batchExtractContent(mergedRequest);

        // Track failed URLs for single batch
        const singleBatchFailedUrls: string[] = [];
        if (result.data.results) {
          result.data.results.forEach(r => {
            if (!r.success) singleBatchFailedUrls.push(r.url);
          });
        }
        if (result.data.errors) {
          result.data.errors.forEach(e => singleBatchFailedUrls.push(e.url));
        }

        setState(prev => ({
          ...prev,
          loading: false,
          results: result.data.results,
          error: null,
          failedUrls: [...new Set(singleBatchFailedUrls)]
        }));

        onSuccess?.(result);
        return result;
      }

      // For large selections, process in chunks
      console.log(`Processing ${urls.length} URLs in chunks of ${CHUNK_SIZE}`);
      
      const chunks = [];
      for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        chunks.push(urls.slice(i, i + CHUNK_SIZE));
      }

      const allResults: any[] = [];
      const allErrors: any[] = [];
      const failedUrls: string[] = [];
      let totalProcessed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkProgress = {
          current: i + 1,
          total: chunks.length,
          urls: chunk.length,
          totalUrls: urls.length,
          processed: totalProcessed,
          percentage: Math.round((totalProcessed / urls.length) * 100)
        };

        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} URLs)`);

        // Update progress
        setState(prev => ({
          ...prev,
          progress: {
            requestId: requestId,
            status: 'processing' as const,
            progress: {
              percentage: chunkProgress.percentage,
              currentUrl: chunk[0],
              completed: totalProcessed,
              total: urls.length,
              rate: 0,
              eta: 0
            },
            timestamp: new Date().toISOString()
          }
        }));

        try {
          const chunkRequest: BatchScrapingRequest = {
            urls: chunk,
            options: {
              ...defaultOptions,
              maxConcurrent,
              ...request.options
            }
          };

          const chunkResult = await batchExtractContent(chunkRequest);
          
          if (chunkResult.data.results) {
            allResults.push(...chunkResult.data.results);
            // Track failed URLs from results
            chunkResult.data.results.forEach(result => {
              if (!result.success) {
                failedUrls.push(result.url);
              }
            });
          }
          if (chunkResult.data.errors) {
            allErrors.push(...chunkResult.data.errors);
            // Track failed URLs from errors  
            chunkResult.data.errors.forEach(error => {
              failedUrls.push(error.url);
            });
          }

          totalProcessed += chunk.length;

          // Update results progressively
          setState(prev => ({
            ...prev,
            results: allResults,
            progress: {
              ...prev.progress!,
              progress: {
                ...prev.progress!.progress,
                percentage: Math.round((totalProcessed / urls.length) * 100),
                completed: totalProcessed
              }
            }
          }));

        } catch (chunkError) {
          console.warn(`Chunk ${i + 1} failed:`, chunkError);
          // Add error for all URLs in this chunk
          const chunkErrors = chunk.map(url => ({
            url,
            code: 'CHUNK_FAILED',
            message: getErrorMessage(chunkError),
            timestamp: new Date().toISOString()
          }));
          allErrors.push(...chunkErrors);
          // Track failed URLs from chunk failure
          failedUrls.push(...chunk);
          totalProcessed += chunk.length;
        }

        // Small delay between chunks to prevent overwhelming the backend
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const finalResult: BatchScrapingResult = {
        success: true,
        data: {
          results: allResults,
          errors: allErrors,
          summary: {
            totalUrls: urls.length,
            successful: allResults.filter(r => r.success).length,
            failed: allResults.filter(r => !r.success).length + allErrors.length,
            successRate: allResults.length > 0 ? (allResults.filter(r => r.success).length / urls.length) * 100 : 0,
            totalProcessingTime: allResults.reduce((sum, r) => sum + r.stats.processingTime, 0)
          }
        },
        processing: {
          requestId,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        }
      };

      setState(prev => ({
        ...prev,
        loading: false,
        results: allResults,
        error: null,
        failedUrls: [...new Set(failedUrls)], // Remove duplicates
        progress: {
          ...prev.progress!,
          status: 'completed',
          progress: {
            ...prev.progress!.progress,
            percentage: 100,
            completed: urls.length
          }
        }
      }));

      onSuccess?.(finalResult);
      return finalResult;

    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
        failedUrls: []
      }));

      onError?.(apiError);
      throw apiError;
    }
  }, [defaultOptions, maxConcurrent, onSuccess, onError]);

  /**
   * Extract content with real-time progress updates
   */
  const batchExtractWithProgress = useCallback(async (request: BatchScrapingRequest): Promise<BatchScrapingResult> => {
    // Clean up any existing progress stream
    if (progressStreamCleanupRef.current) {
      progressStreamCleanupRef.current();
      progressStreamCleanupRef.current = null;
    }

    const requestId = `batch-progress-${Date.now()}`;
    lastRequestRef.current = request;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      requestId,
      progress: null,
      results: []
    }));

    return new Promise((resolve, reject) => {
      // Set up progress stream
      progressStreamCleanupRef.current = createProgressStream(
        requestId,
        (progress) => {
          setState(prev => ({ ...prev, progress }));
          onProgress?.(progress);
          
          // Update results if available
          if (progress.results && progress.status === 'completed') {
            // Note: In a real implementation, you'd need to fetch the final results
            // This is a simplified version
          }
        },
        (error) => {
          const apiError: ApiError = {
            code: error.code,
            message: error.message
          };
          
          setState(prev => ({
            ...prev,
            loading: false,
            error: apiError
          }));
          
          onError?.(apiError);
          reject(apiError);
        },
        () => {
          setState(prev => ({ ...prev, loading: false }));
        }
      );

      // Start the batch extraction
      batchExtract({
        ...request,
        progressCallback: requestId // This would be used by the backend to send progress updates
      })
        .then(resolve)
        .catch(reject);
    });
  }, [batchExtract, onProgress, onError]);

  /**
   * Cancel the current extraction operation
   */
  const cancel = useCallback(async () => {
    if (state.requestId) {
      try {
        await cancelOperation(state.requestId);
      } catch (error) {
        console.warn('Failed to cancel operation:', error);
      }
    }

    // Clean up progress stream
    if (progressStreamCleanupRef.current) {
      progressStreamCleanupRef.current();
      progressStreamCleanupRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: false,
      requestId: null,
      progress: null
    }));
  }, [state.requestId]);

  /**
   * Retry only the failed URLs from the last batch extraction
   */
  const retry = useCallback(async (): Promise<BatchScrapingResult | null> => {
    if (!lastRequestRef.current) {
      throw new Error('No previous request to retry');
    }
    
    if (state.failedUrls.length === 0) {
      throw new Error('No failed URLs to retry');
    }
    
    // Create new request with only failed URLs
    const retryRequest: BatchScrapingRequest = {
      urls: state.failedUrls,
      options: lastRequestRef.current.options
    };
    
    console.log(`Retrying ${state.failedUrls.length} failed URLs:`, state.failedUrls);
    return batchExtract(retryRequest);
  }, [batchExtract, state.failedUrls]);

  /**
   * Clear results and reset state
   */
  const clear = useCallback(() => {
    cancel();
    setState({
      loading: false,
      results: [],
      progress: null,
      error: null,
      requestId: null,
      failedUrls: []
    });
    lastRequestRef.current = null;
  }, [cancel]);

  /**
   * Get extraction statistics
   */
  const getStats = useCallback(() => {
    if (state.results.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageProcessingTime: 0
      };
    }

    const successful = state.results.filter(r => r.success).length;
    const failed = state.results.length - successful;
    const successRate = (successful / state.results.length) * 100;
    const averageProcessingTime = state.results.reduce((sum, r) => sum + r.stats.processingTime, 0) / state.results.length;

    return {
      total: state.results.length,
      successful,
      failed,
      successRate,
      averageProcessingTime
    };
  }, [state.results]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressStreamCleanupRef.current) {
        progressStreamCleanupRef.current();
      }
    };
  }, []);

  // Computed values
  const successfulResults = state.results.filter(r => r.success).length;
  const failedResults = state.results.filter(r => !r.success).length;
  const successRate = state.results.length > 0 
    ? (successfulResults / state.results.length) * 100 
    : 0;

  return {
    // State
    loading: state.loading,
    results: state.results,
    progress: state.progress,
    error: state.error,
    requestId: state.requestId,

    // Actions
    extractSingle,
    batchExtract,
    batchExtractWithProgress,
    cancel,
    retry,
    clear,

    // Computed values
    hasResults: state.results.length > 0,
    hasError: !!state.error,
    canRetry: state.failedUrls.length > 0 && !state.loading && !!lastRequestRef.current,
    successfulResults,
    failedResults,
    successRate,

    // Utilities
    getStats,

    // Progress information
    isProcessing: state.loading,
    progressPercentage: state.progress?.progress.percentage || 0,
    currentUrl: state.progress?.progress.currentUrl,
    eta: state.progress?.progress.eta,
    processingRate: state.progress?.progress.rate
  };
}

export type UseContentExtractionReturn = ReturnType<typeof useContentExtraction>;