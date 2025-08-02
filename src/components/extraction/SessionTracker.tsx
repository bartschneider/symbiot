import { useMemo } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UseContentExtractionReturn } from '@/hooks/useContentExtraction';
import { UserDecision } from '@/types/sitemap';

interface SessionTrackerProps {
  extractionHook: UseContentExtractionReturn;
  userDecision?: UserDecision;
  sessionName?: string;
  className?: string;
}

const TrackerCard = styled(Card)`
  padding: ${theme.spacing.xl};
  background: ${theme.colors.bg.primary};
  border: 2px solid ${theme.colors.accent}40;
  position: relative;
  overflow: hidden;
`;

const SessionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg};
`;

const SessionTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SessionIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

const SessionSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${theme.colors.accent}40;
  border-top: 2px solid ${theme.colors.accent};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DecisionBadge = styled.div<{ $action: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  background: ${({ $action }) => {
    switch ($action) {
      case 'extract': return `${theme.colors.success}20`;
      case 'update': return `${theme.colors.info}20`;
      case 'retry': return `${theme.colors.error}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  color: ${({ $action }) => {
    switch ($action) {
      case 'extract': return theme.colors.success;
      case 'update': return theme.colors.info;
      case 'retry': return theme.colors.error;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const ProgressSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background: ${theme.colors.bg.secondary};
  border-radius: ${theme.layout.borderRadius.lg};
  overflow: hidden;
  margin: ${theme.spacing.md} 0;
  position: relative;
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.info});
  border-radius: ${theme.layout.borderRadius.lg};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ProgressText = styled.div`
  text-align: center;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.sm};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const StatCard = styled.div`
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CurrentUrlSection = styled.div`
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
  margin-bottom: ${theme.spacing.lg};
`;

const CurrentUrlLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
  text-align: center;
`;

const CurrentUrl = styled.div`
  font-family: monospace;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  word-break: break-all;
  text-align: center;
  background: ${theme.colors.bg.primary};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
`;

const BackgroundPattern = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  opacity: 0.05;
  background: radial-gradient(circle, ${theme.colors.accent} 2px, transparent 2px);
  background-size: 20px 20px;
  pointer-events: none;
`;

export function SessionTracker({
  extractionHook,
  userDecision,
  sessionName,
  className
}: SessionTrackerProps) {
  const { loading, progress, results, cancel } = extractionHook;

  const sessionStats = useMemo(() => {
    if (!progress) return null;

    const progressData = progress.progress;
    const successfulResults = results.filter(r => r.success).length;
    const failedResults = results.filter(r => !r.success).length;
    const currentChunk = Math.ceil(progressData.completed / 25);
    const totalChunks = Math.ceil(progressData.total / 25);

    return {
      progress: progressData,
      chunks: { current: currentChunk, total: totalChunks },
      results: { successful: successfulResults, failed: failedResults },
      rate: progressData.rate || 0
    };
  }, [progress, results]);

  const getSessionName = () => {
    if (sessionName) return sessionName;
    if (userDecision) {
      const action = userDecision.action;
      const actionLabels = {
        extract: 'Fresh Extraction',
        update: 'Content Update',
        retry: 'Retry Session',
        skip: 'Skipped Session'
      };
      return actionLabels[action] || 'Extraction Session';
    }
    return 'Extraction Session';
  };

  const formatRate = (rate: number) => {
    if (rate < 1) return `${(rate * 60).toFixed(1)}/min`;
    return `${rate.toFixed(1)}/min`;
  };

  if (!loading || !sessionStats) {
    return null;
  }

  return (
    <TrackerCard className={className}>
      <BackgroundPattern />
      
      <SessionHeader>
        <SessionTitle>
          <SessionIcon>
            {loading ? <SessionSpinner /> : '✓'}
          </SessionIcon>
          {getSessionName()}
        </SessionTitle>
        
        {userDecision && (
          <DecisionBadge $action={userDecision.action}>
            {userDecision.action} Mode
          </DecisionBadge>
        )}
      </SessionHeader>

      <ProgressSection>
        <ProgressText>
          {sessionStats.progress.percentage}% Complete
        </ProgressText>
        
        <ProgressBar>
          <ProgressFill
            $progress={sessionStats.progress.percentage}
            animate={{ width: `${sessionStats.progress.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </ProgressBar>
      </ProgressSection>

      <StatsGrid>
        <StatCard>
          <StatValue>{sessionStats.chunks.current} / {sessionStats.chunks.total}</StatValue>
          <StatLabel>Chunks</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{sessionStats.progress.completed} / {sessionStats.progress.total}</StatValue>
          <StatLabel>URLs</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>✅ {sessionStats.results.successful}</StatValue>
          <StatLabel>Success</StatLabel>
        </StatCard>
        
        {sessionStats.results.failed > 0 && (
          <StatCard>
            <StatValue>❌ {sessionStats.results.failed}</StatValue>
            <StatLabel>Failed</StatLabel>
          </StatCard>
        )}
        
        {sessionStats.rate > 0 && (
          <StatCard>
            <StatValue>{formatRate(sessionStats.rate)}</StatValue>
            <StatLabel>Rate</StatLabel>
          </StatCard>
        )}
      </StatsGrid>

      {sessionStats.progress.currentUrl && (
        <CurrentUrlSection>
          <CurrentUrlLabel>Currently processing:</CurrentUrlLabel>
          <CurrentUrl>{sessionStats.progress.currentUrl}</CurrentUrl>
        </CurrentUrlSection>
      )}

      <ActionButtons>
        <Button
          variant="ghost"
          onClick={cancel}
          disabled={!loading}
        >
          Cancel Extraction
        </Button>
      </ActionButtons>
    </TrackerCard>
  );
}

export default SessionTracker;