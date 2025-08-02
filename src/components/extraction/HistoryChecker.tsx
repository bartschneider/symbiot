import { useEffect } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import { UseExtractionHistoryReturn } from '@/hooks/useExtractionHistory';
import { ExtractionHistory } from '@/types/sitemap';

interface HistoryCheckerProps {
  url: string;
  onHistoryLoaded?: (history: ExtractionHistory) => void;
  historyHook: UseExtractionHistoryReturn;
  className?: string;
}

const CheckerCard = styled(Card)<{ $status: 'checking' | 'found' | 'not-found' | 'error' }>`
  padding: ${theme.spacing.lg};
  border-left: 4px solid ${({ $status }) => {
    switch ($status) {
      case 'checking': return theme.colors.info;
      case 'found': return theme.colors.accent;
      case 'not-found': return theme.colors.success;
      case 'error': return theme.colors.error;
      default: return theme.colors.border;
    }
  }};
  margin-bottom: ${theme.spacing.md};
`;

const StatusIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
  
  &::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $status }) => {
      switch ($status) {
        case 'checking': return theme.colors.info;
        case 'found': return theme.colors.accent;
        case 'not-found': return theme.colors.success;
        case 'error': return theme.colors.error;
        default: return theme.colors.border;
      }
    }};
    ${({ $status }) => $status === 'checking' ? `
      animation: pulse 2s infinite;
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    ` : ''}
  }
`;

const StatusText = styled.span`
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
`;

const HistoryDetails = styled.div`
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  margin-top: ${theme.spacing.sm};
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xs} 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.border};
  }
`;

const DetailLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const DetailValue = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.regular};
  font-size: ${theme.typography.fontSize.sm};
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  background: ${({ $status }) => {
    switch ($status) {
      case 'success': return `${theme.colors.success}20`;
      case 'failed': return `${theme.colors.error}20`;
      case 'processing': return `${theme.colors.info}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'success': return theme.colors.success;
      case 'failed': return theme.colors.error;
      case 'processing': return theme.colors.info;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.error}10;
  border-radius: ${theme.layout.borderRadius.sm};
`;

export function HistoryChecker({ 
  url, 
  onHistoryLoaded, 
  historyHook, 
  className 
}: HistoryCheckerProps) {
  const { 
    historyState, 
    checkHistory, 
    formatLastExtracted, 
    getStatusColor 
  } = historyHook;

  // Auto-check history when URL changes
  useEffect(() => {
    const trimmed = url.trim();
    if (trimmed) {
      // Debug trace for lifecycle
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[EXTRACT-FE] HistoryChecker:effect', {
          url: trimmed,
          checking: historyState.checking,
          hasHistory: !!historyState.history,
          hasError: !!historyState.error
        });
      }
      checkHistory(trimmed)
        .then(history => {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[EXTRACT-FE] HistoryChecker:onHistoryLoaded', {
              exists: history?.exists,
              lastStatus: history?.lastStatus,
              sessionIdPrefix: history?.sessionId ? String(history.sessionId).slice(0, 8) : undefined
            });
          }
          onHistoryLoaded?.(history);
        })
        .catch((e) => {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[EXTRACT-FE] HistoryChecker:checkHistory:error', { message: (e as any)?.message });
          }
          // Error handled by the hook
        });
    }
  }, [url, checkHistory, onHistoryLoaded, historyState.checking, historyState.history, historyState.error]);

  const getStatus = () => {
    if (historyState.checking) return 'checking';
    if (historyState.error) return 'error';
    if (historyState.history?.exists) return 'found';
    return 'not-found';
  };

  const getStatusMessage = () => {
    if (historyState.checking) return 'Checking extraction history...';
    if (historyState.error) return 'Error checking history';
    if (historyState.history?.exists) return 'URL found in extraction history';
    return 'URL not previously extracted';
  };

  const status = getStatus();

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[EXTRACT-FE] HistoryChecker:render', {
      status,
      checking: historyState.checking,
      hasError: !!historyState.error,
      exists: !!historyState.history?.exists
    });
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <CheckerCard $status={status}>
        <StatusIndicator $status={status}>
          <StatusText>{getStatusMessage()}</StatusText>
        </StatusIndicator>

        {historyState.error && (
          <ErrorMessage>
            {historyState.error}
          </ErrorMessage>
        )}

        {historyState.history?.exists && (
          <HistoryDetails>
            <DetailRow>
              <DetailLabel>Extraction Count:</DetailLabel>
              <DetailValue>{historyState.history.extractionCount}</DetailValue>
            </DetailRow>
            
            <DetailRow>
              <DetailLabel>Last Extracted:</DetailLabel>
              <DetailValue>
                {formatLastExtracted(historyState.history.lastExtracted)}
              </DetailValue>
            </DetailRow>
            
            <DetailRow>
              <DetailLabel>Last Status:</DetailLabel>
              <DetailValue>
                {historyState.history.lastStatus && (
                  <StatusBadge $status={historyState.history.lastStatus}>
                    {historyState.history.lastStatus}
                  </StatusBadge>
                )}
              </DetailValue>
            </DetailRow>
            
            {historyState.history.sessionId && (
              <DetailRow>
                <DetailLabel>Session ID:</DetailLabel>
                <DetailValue 
                  $color={theme.colors.accent}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                >
                  {historyState.history.sessionId.slice(0, 8)}...
                </DetailValue>
              </DetailRow>
            )}
          </HistoryDetails>
        )}
      </CheckerCard>
    </motion.div>
  );
}

export default HistoryChecker;