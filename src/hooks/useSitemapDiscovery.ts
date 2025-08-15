'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  discoverSitemap as apiDiscoverSitemap, 
  healthCheck,
  isApiError,
  getErrorMessage
} from '@/services/sitemapApi';
import {
  SitemapDiscoveryRequest,
  SitemapDiscoveryResult,
  ApiError,
  LinkData,
  LinkCategory
} from '@/types/sitemap';

interface UseSitemapDiscoveryState {
  loading: boolean;
  result: SitemapDiscoveryResult | null;
  linkData: LinkData[];
  error: ApiError | null;
  requestId: string | null;
}

interface UseSitemapDiscoveryOptions {
  autoValidate?: boolean;
  onSuccess?: (result: SitemapDiscoveryResult) => void;
  onError?: (error: ApiError) => void;
}

export function useSitemapDiscovery(options: UseSitemapDiscoveryOptions = {}) {
  const { autoValidate = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseSitemapDiscoveryState>({
    loading: false,
    result: null,
    linkData: [],
    error: null,
    requestId: null
  });

  const [urlValidation, setUrlValidation] = useState<{
    validating: boolean;
    valid: boolean | null;
    message?: string;
  }>({
    validating: false,
    valid: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Convert discovery result to LinkData format for the selection system
   */
  const convertToLinkData = useCallback((result: SitemapDiscoveryResult): LinkData[] => {
    const linkData: LinkData[] = [];
    
    try {
      // Validate that categories exist and have the expected structure
      if (!result.data.categories || typeof result.data.categories !== 'object') {
        console.error('Invalid categories structure in sitemap result:', result.data);
        return linkData;
      }
      
      // Expected category keys
      const expectedCategories: LinkCategory[] = ['internal', 'external', 'files', 'email', 'phone', 'anchors'];
      
      Object.entries(result.data.categories).forEach(([category, links]) => {
        // Validate category is expected
        if (!expectedCategories.includes(category as LinkCategory)) {
          console.warn(`Unexpected category '${category}' in sitemap result, skipping`);
          return;
        }
        
        // Validate links is an array
        if (!Array.isArray(links)) {
          console.error(`Category '${category}' links is not an array:`, links);
          return;
        }
        
        links.forEach((link, index) => {
          // Handle both string URLs and LinkEntry objects
          const linkUrl = typeof link === 'string' ? link : link.url;
          const linkData_entry = typeof link === 'object' ? link : { url: link };
          
          if (!linkUrl) {
            console.warn(`Invalid link at category '${category}', index ${index}:`, link);
            return;
          }
          
          linkData.push({
            id: `${category}-${index}-${linkUrl}`,
            url: linkUrl,
            category: category as LinkCategory,
            lastmod: linkData_entry.lastmod,
            changefreq: linkData_entry.changefreq,
            priority: linkData_entry.priority
          });
        });
      });
      
      console.log(`Converted ${linkData.length} links from ${Object.keys(result.data.categories).length} categories`);
    } catch (error) {
      console.error('Error converting sitemap data to LinkData format:', error);
    }
    
    return linkData;
  }, []);

  /**
   * Simple URL validation
   */
  const validateUrl = useCallback(async (url: string) => {
    if (!autoValidate || !url.trim()) {
      setUrlValidation({ validating: false, valid: null });
      return;
    }

    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    setUrlValidation({ validating: true, valid: null });

    // Debounce validation
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // Basic URL validation
        const urlObj = new URL(url);
        const isValidProtocol = ['http:', 'https:'].includes(urlObj.protocol);
        
        if (!isValidProtocol) {
          setUrlValidation({
            validating: false,
            valid: false,
            message: 'URL must use HTTP or HTTPS protocol'
          });
          return;
        }

        // Check if service is available
        const serviceAvailable = await healthCheck();
        
        setUrlValidation({
          validating: false,
          valid: serviceAvailable,
          message: serviceAvailable ? 'Valid URL' : 'Sitemap service unavailable'
        });
      } catch (error) {
        setUrlValidation({
          validating: false,
          valid: false,
          message: 'Invalid URL format'
        });
      }
    }, 500);
  }, [autoValidate]);

  /**
   * Discover sitemap for a given URL
   */
  const discoverSitemap = useCallback(async (request: SitemapDiscoveryRequest) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const requestId = `sitemap-${Date.now()}`;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      requestId
    }));

    try {
      const result = await apiDiscoverSitemap(request);

      // Convert to selection system format
      const linkData = convertToLinkData(result);

      setState(prev => ({
        ...prev,
        loading: false,
        result,
        linkData,
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
        error: apiError
      }));

      onError?.(apiError);
      throw apiError;
    }
  }, [convertToLinkData, onSuccess, onError]);

  /**
   * Cancel current discovery operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: false,
      requestId: null
    }));
  }, []);

  /**
   * Clear current results and errors
   */
  const clear = useCallback(() => {
    cancel();
    setState({
      loading: false,
      result: null,
      linkData: [],
      error: null,
      requestId: null
    });
    setUrlValidation({ validating: false, valid: null });
  }, [cancel]);

  /**
   * Retry the last discovery operation
   */
  const retry = useCallback(async (lastRequest?: SitemapDiscoveryRequest) => {
    if (!lastRequest) {
      throw new Error('No request to retry');
    }
    return discoverSitemap(lastRequest);
  }, [discoverSitemap]);

  /**
   * Get summary statistics from the current result
   */
  const getSummaryStats = useCallback(() => {
    if (!state.result) return null;
    
    return {
      ...state.result.data.summary,
      categories: Object.keys(state.result.data.categories).length,
      processingTime: state.result.processing.processingTime
    };
  }, [state.result]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [cancel]);

  return {
    // State
    loading: state.loading,
    result: state.result,
    linkData: state.linkData,
    error: state.error,
    requestId: state.requestId,
    
    // URL Validation
    urlValidation,
    validateUrl,
    
    // Actions
    discoverSitemap,
    retry,
    cancel,
    clear,
    
    // Utilities
    getSummaryStats,
    
    // Computed properties
    hasResult: !!state.result,
    hasError: !!state.error,
    canRetry: !!state.error && !state.loading,
    isValidUrl: urlValidation.valid === true,
    isEmpty: state.linkData.length === 0,
    totalLinks: state.linkData.length
  };
}

export type UseSitemapDiscoveryReturn = ReturnType<typeof useSitemapDiscovery>;