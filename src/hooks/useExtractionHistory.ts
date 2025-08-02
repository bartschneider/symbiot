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

const FE_DEBUG = typeof window !== 'undefined' ? (window as any).__DEBUG_EXTRACT__ ?? (process.env.NODE_ENV !== 'production') : (process.env.NODE_ENV !== 'production');
const feLog = (event: string, ctx: Record<string, unknown> = {}) => {
  if (!FE_DEBUG) return;
  try {
    // Avoid dumping huge payloads
    const safe = JSON.stringify(ctx, (_, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v));
    // eslint-disable-next-line no-console
    console.log(`[EXTRACT-FE] ${event} ${safe}`);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[EXTRACT-FE] ${event}`, ctx);
  }
};

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
    const t0 = Date.now();
    feLog('checkHistory:start', { url });
    setHistoryState(prev => ({
      ...prev,
      checking: true,
      error: null
    }));

    try {
      const history = await checkExtractionHistory(url);
      feLog('checkHistory:success', {
        url,
        ms: Date.now() - t0,
        exists: history?.exists,
        lastStatus: history?.lastStatus,
        sessionIdPrefix: history?.sessionId ? String(history.sessionId).slice(0, 8) : undefined
      });
      
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

      feLog('checkHistory:error', { url, ms: Date.now() - t0, code: apiError.code, message: apiError.message });

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

    feLog('makeDecision', { action, sourceUrl, hasHistory: !!historyState.history });

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
    feLog('clearHistory');
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
    const t0 = Date.now();
    feLog('loadSessions:start', options);
    setSessions(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getExtractionSessions(options);
      feLog('loadSessions:success', { ms: Date.now() - t0, count: result.sessions?.length, pagination: result.pagination });
      
      // Normalize to align API response to ExtractionSession strict typing
      const normalized = (result.sessions || []).map((s: any) => ({
        ...s,
        status: (['failed','processing','completed','cancelled'] as const).includes(s.status) ? s.status : (String(s.status || '').toLowerCase() as 'failed'|'processing'|'completed'|'cancelled')
      })) as ExtractionSession[];
      
      setSessions({
        data: normalized,
        pagination: result.pagination,
        loading: false,
        error: null
      });

      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      feLog('loadSessions:error', { ms: Date.now() - t0, message: errorMessage });
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
    const t0 = Date.now();
    feLog('loadRetryableUrls:start', options);
    setRetryableUrls(prev => ({ ...prev, loading: true, error: null }));

    try {
      const urls = await getRetryableUrls(options);
      feLog('loadRetryableUrls:success', { ms: Date.now() - t0, count: urls?.length });
      
      setRetryableUrls({
        data: urls,
        loading: false,
        error: null
      });

      return urls;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      feLog('loadRetryableUrls:error', { ms: Date.now() - t0, message: errorMessage });
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
    const t0 = Date.now();
    feLog('createRetry:start', { count: extractionIds?.length, sessionName });
    try {
      const result = await createRetrySession(extractionIds, { sessionName });
      feLog('createRetry:success', { ms: Date.now() - t0, sessionId: (result as any)?.session?.id });
      
      // Refresh sessions list
      await loadSessions();
      
      return result;
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      feLog('createRetry:error', { ms: Date.now() - t0, code: apiError.code, message: apiError.message });

      onError?.(apiError);
      throw apiError;
    }
  }, [loadSessions, onError]);

  /**
   * Get session details
   */
  const getSessionDetail = useCallback(async (sessionId: string) => {
    const t0 = Date.now();
    feLog('getSessionDetail:start', { sessionId });
    try {
      const res = await getSessionDetails(sessionId);
      feLog('getSessionDetail:success', { ms: Date.now() - t0, hasSession: !!(res as any)?.session, items: (res as any)?.extractions?.length });
      return res;
    } catch (error) {
      const apiError: ApiError = isApiError(error)
        ? { code: error.code, message: error.message }
        : { code: 'UNKNOWN_ERROR', message: getErrorMessage(error) };

      feLog('getSessionDetail:error', { ms: Date.now() - t0, code: apiError.code, message: apiError.message });

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