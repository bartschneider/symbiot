import { useState, useCallback } from 'react';
import {
  checkExtractionHistory,
  getExtractionSessions,
  getRetryableUrls,
  createRetrySession,
  getSessionDetails,
  isApiError,
  getErrorMessage
} from '@/services/sitemapApi';
import {
  ExtractionHistory,
  ExtractionSession,
  RetryableUrl,
  UserDecision,
  HistoryWorkflowState,
  ApiError
} from '@/types/sitemap';

interface UseExtractionHistoryOptions {
  onDecision?: (decision: UserDecision) => void;
  onError?: (error: ApiError) => void;
}

export function useExtractionHistory(options: UseExtractionHistoryOptions = {}) {
  const { onDecision, onError } = options;

  const [historyState, setHistoryState] = useState<HistoryWorkflowState>({
    checking: false,
    history: null,
    decision: null,
    error: null
  });

  const [sessions, setSessions] = useState<{
    data: ExtractionSession[];
    pagination: any;
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    pagination: null,
    loading: false,
    error: null
  });

  const [retryableUrls, setRetryableUrls] = useState<{
    data: RetryableUrl[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: false,
    error: null
  });

  /**
   * Check extraction history for a URL
   */
  const checkHistory = useCallback(async (url: string): Promise<ExtractionHistory> => {
    setHistoryState(prev => ({
      ...prev,
      checking: true,
      error: null
    }));

    try {
      const history = await checkExtractionHistory(url);
      
      setHistoryState(prev => ({
        ...prev,
        checking: false,
        history
      }));

      return history;
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      setHistoryState(prev => ({
        ...prev,
        checking: false,
        error: apiError.message
      }));

      onError?.(apiError);
      throw apiError;
    }
  }, [onError]);

  /**
   * Make user decision about extraction workflow
   */
  const makeDecision = useCallback((action: UserDecision['action'], sourceUrl: string) => {
    const decision: UserDecision = {
      action,
      sourceUrl,
      history: historyState.history || undefined
    };

    setHistoryState(prev => ({
      ...prev,
      decision
    }));

    onDecision?.(decision);
    return decision;
  }, [historyState.history, onDecision]);

  /**
   * Clear history state and start fresh workflow
   */
  const clearHistory = useCallback(() => {
    setHistoryState({
      checking: false,
      history: null,
      decision: null,
      error: null
    });
  }, []);

  /**
   * Load extraction sessions
   */
  const loadSessions = useCallback(async (options: {
    page?: number;
    limit?: number;
    status?: string;
    sourceUrl?: string;
  } = {}) => {
    setSessions(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getExtractionSessions(options);
      
      setSessions({
        data: result.sessions,
        pagination: result.pagination,
        loading: false,
        error: null
      });

      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setSessions(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  /**
   * Load retryable URLs
   */
  const loadRetryableUrls = useCallback(async (options: {
    sessionId?: string;
    errorCode?: string;
    limit?: number;
  } = {}) => {
    setRetryableUrls(prev => ({ ...prev, loading: true, error: null }));

    try {
      const urls = await getRetryableUrls(options);
      
      setRetryableUrls({
        data: urls,
        loading: false,
        error: null
      });

      return urls;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setRetryableUrls(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  /**
   * Create retry session from failed extractions
   */
  const createRetry = useCallback(async (extractionIds: string[], sessionName?: string) => {
    try {
      const result = await createRetrySession(extractionIds, { sessionName });
      
      // Refresh sessions list
      await loadSessions();
      
      return result;
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      onError?.(apiError);
      throw apiError;
    }
  }, [loadSessions, onError]);

  /**
   * Get session details
   */
  const getSessionDetail = useCallback(async (sessionId: string) => {
    try {
      return await getSessionDetails(sessionId);
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      onError?.(apiError);
      throw apiError;
    }
  }, [onError]);

  /**
   * Determine if URL needs user decision
   */
  const needsDecision = useCallback((history: ExtractionHistory | null): boolean => {
    if (!history) return false;
    return history.exists && (history.lastStatus === 'success' || history.lastStatus === 'failed');
  }, []);

  /**
   * Get recommendation for user action
   */
  const getRecommendation = useCallback((history: ExtractionHistory): UserDecision['action'] => {
    if (history.lastStatus === 'failed') {
      return 'retry';
    }
    if (history.lastStatus === 'success') {
      // If extracted recently (less than 7 days), suggest update
      if (history.lastExtracted) {
        const lastDate = new Date(history.lastExtracted);
        const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 7 ? 'update' : 'extract';
      }
    }
    return 'extract';
  }, []);

  return {
    // History workflow state
    historyState,
    
    // History workflow actions
    checkHistory,
    makeDecision,
    clearHistory,
    needsDecision,
    getRecommendation,
    
    // Sessions management
    sessions,
    loadSessions,
    getSessionDetail,
    
    // Retry management
    retryableUrls,
    loadRetryableUrls,
    createRetry,
    
    // Computed properties
    hasHistory: !!historyState.history,
    isChecking: historyState.checking,
    hasDecision: !!historyState.decision,
    hasError: !!historyState.error,
    
    // Utility functions
    formatLastExtracted: (dateString?: string) => {
      if (!dateString) return 'Never';
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    },
    
    getStatusColor: (status: string) => {
      switch (status) {
        case 'success':
        case 'completed':
          return '#68FFC9';
        case 'failed':
          return '#FF3D71';
        case 'processing':
          return '#FFB800';
        default:
          return '#888';
      }
    }
  };
}

export type UseExtractionHistoryReturn = ReturnType<typeof useExtractionHistory>;