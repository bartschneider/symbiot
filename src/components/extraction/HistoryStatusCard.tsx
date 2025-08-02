import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UseExtractionHistoryReturn } from '@/hooks/useExtractionHistory';
import { ExtractionSession } from '@/types/sitemap';

interface HistoryStatusCardProps {
  sourceUrl: string;
  historyHook: UseExtractionHistoryReturn;
  onViewSession?: (session: ExtractionSession) => void;
  className?: string;
}

const StatusCard = styled(Card)`
  padding: ${theme.spacing.lg};
  background: ${theme.colors.bg.primary};
  border: 1px solid ${theme.colors.border};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg};
`;

const CardTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CardIcon = styled.span`
  font-size: 1.2em;
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${theme.colors.border};
  border-top: 2px solid ${theme.colors.accent};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SessionItem = styled(motion.div)`
  background: ${theme.colors.bg.secondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.md};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${theme.colors.accent};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${theme.colors.accent}20;
  }
`;

const SessionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const SessionName = styled.span`
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.base};
`;

const SessionStatus = styled.span<{ $status: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  background: ${({ $status }) => {
    switch ($status) {
      case 'completed': return `${theme.colors.success}20`;
      case 'failed': return `${theme.colors.error}20`;
      case 'processing': return `${theme.colors.info}20`;
      case 'cancelled': return `${theme.colors.text.secondary}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'completed': return theme.colors.success;
      case 'failed': return theme.colors.error;
      case 'processing': return theme.colors.info;
      case 'cancelled': return theme.colors.text.secondary;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const SessionStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SessionDate = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  text-align: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${theme.spacing.md};
  opacity: 0.5;
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.error}10;
  border-radius: ${theme.layout.borderRadius.sm};
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: flex-end;
  margin-top: ${theme.spacing.md};
`;

export function HistoryStatusCard({
  sourceUrl,
  historyHook,
  onViewSession,
  className
}: HistoryStatusCardProps) {
  const { sessions, loadSessions, formatLastExtracted } = historyHook;
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (sourceUrl) {
      loadSessions({ sourceUrl, limit: 5 });
    }
  }, [sourceUrl, loadSessions]);

  const handleSessionClick = (session: ExtractionSession) => {
    if (expandedSession === session.id) {
      setExpandedSession(null);
    } else {
      setExpandedSession(session.id);
      onViewSession?.(session);
    }
  };

  const handleRefresh = () => {
    loadSessions({ sourceUrl, limit: 5 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuccessRate = (session: ExtractionSession) => {
    if (session.totalUrls === 0) return 0;
    return Math.round((session.successfulUrls / session.totalUrls) * 100);
  };

  return (
    <StatusCard className={className}>
      <CardHeader>
        <CardTitle>
          <CardIcon>📊</CardIcon>
          Extraction History
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={sessions.loading}
        >
          {sessions.loading ? <LoadingSpinner /> : '🔄'}
        </Button>
      </CardHeader>

      {sessions.error && (
        <ErrorMessage>
          {sessions.error}
        </ErrorMessage>
      )}

      {sessions.loading && sessions.data.length === 0 && (
        <EmptyState>
          <LoadingSpinner style={{ margin: '0 auto' }} />
          <p>Loading extraction history...</p>
        </EmptyState>
      )}

      {!sessions.loading && sessions.data.length === 0 && !sessions.error && (
        <EmptyState>
          <EmptyIcon>📭</EmptyIcon>
          <p>No extraction history found for this URL</p>
        </EmptyState>
      )}

      {sessions.data.length > 0 && (
        <SessionsList>
          {sessions.data.map((session) => (
            <SessionItem
              key={session.id}
              onClick={() => handleSessionClick(session)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                borderColor: expandedSession === session.id ? theme.colors.accent : undefined
              }}
            >
              <SessionHeader>
                <SessionName>{session.sessionName}</SessionName>
                <SessionStatus $status={session.status}>
                  {session.status}
                </SessionStatus>
              </SessionHeader>

              <SessionStats>
                <StatItem>
                  <StatValue>{session.totalUrls}</StatValue>
                  <StatLabel>Total</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{session.successfulUrls}</StatValue>
                  <StatLabel>Success</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{session.failedUrls}</StatValue>
                  <StatLabel>Failed</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{getSuccessRate(session)}%</StatValue>
                  <StatLabel>Rate</StatLabel>
                </StatItem>
              </SessionStats>

              <SessionDate>
                Started: {formatDate(session.createdAt)}
                {session.completedAt && (
                  <> • Completed: {formatDate(session.completedAt)}</>
                )}
              </SessionDate>
            </SessionItem>
          ))}
        </SessionsList>
      )}

      {sessions.pagination && sessions.pagination.total > sessions.data.length && (
        <ActionRow>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadSessions({ 
              sourceUrl, 
              page: sessions.pagination.page + 1,
              limit: 10 
            })}
            disabled={sessions.loading}
          >
            Load More ({sessions.pagination.total - sessions.data.length} remaining)
          </Button>
        </ActionRow>
      )}
    </StatusCard>
  );
}

export default HistoryStatusCard;