import { useState } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UseExtractionHistoryReturn } from '@/hooks/useExtractionHistory';
import { ExtractionHistory, UserDecision } from '@/types/sitemap';

interface HistoryDecisionPromptProps {
  history: ExtractionHistory;
  sourceUrl: string;
  onDecision: (decision: UserDecision) => void;
  historyHook: UseExtractionHistoryReturn;
  className?: string;
}

const PromptOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.lg};
`;

const PromptCard = styled(Card)`
  max-width: 600px;
  width: 100%;
  padding: ${theme.spacing.xl};
  background: ${theme.colors.bg.primary};
  border: 2px solid ${theme.colors.accent}40;
`;

const PromptTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const UrlDisplay = styled.div`
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
  margin-bottom: ${theme.spacing.lg};
  font-family: monospace;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  word-break: break-all;
  text-align: center;
`;

const HistorySummary = styled.div`
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.layout.borderRadius.sm};
  margin-bottom: ${theme.spacing.lg};
  border-left: 4px solid ${theme.colors.accent};
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const SummaryItem = styled.div`
  text-align: center;
`;

const SummaryValue = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const SummaryLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatusIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: ${({ $status }) => {
    switch ($status) {
      case 'success': return `${theme.colors.success}20`;
      case 'failed': return `${theme.colors.error}20`;
      default: return `${theme.colors.info}20`;
    }
  }};
  border-radius: ${theme.layout.borderRadius.sm};
  
  &::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $status }) => {
      switch ($status) {
        case 'success': return theme.colors.success;
        case 'failed': return theme.colors.error;
        default: return theme.colors.info;
      }
    }};
  }
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

const ActionCard = styled(motion.div)<{ $recommended?: boolean }>`
  background: ${({ $recommended }) => 
    $recommended ? `${theme.colors.accent}10` : theme.colors.bg.secondary};
  border: 2px solid ${({ $recommended }) => 
    $recommended ? theme.colors.accent : theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.lg};
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${theme.colors.accent};
    box-shadow: 0 4px 12px ${theme.colors.accent}20;
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${theme.spacing.sm};
`;

const ActionTitle = styled.h4`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.xs} 0;
`;

const ActionDescription = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin: 0;
  line-height: 1.4;
`;

const RecommendedBadge = styled.div`
  background: ${theme.colors.accent};
  color: white;
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  text-transform: uppercase;
  margin-top: ${theme.spacing.sm};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
`;

export function HistoryDecisionPrompt({
  history,
  sourceUrl,
  onDecision,
  historyHook,
  className
}: HistoryDecisionPromptProps) {
  const [selectedAction, setSelectedAction] = useState<UserDecision['action'] | null>(null);
  const { formatLastExtracted, getRecommendation } = historyHook;

  const recommendedAction = getRecommendation(history);

  const handleActionSelect = (action: UserDecision['action']) => {
    setSelectedAction(action);
  };

  const handleConfirm = () => {
    if (selectedAction) {
      const decision: UserDecision = {
        action: selectedAction,
        sourceUrl,
        history
      };
      onDecision(decision);
    }
  };

  const handleSkip = () => {
    const decision: UserDecision = {
      action: 'skip',
      sourceUrl,
      history
    };
    onDecision(decision);
  };

  const actionOptions = [
    {
      action: 'extract' as const,
      icon: '🚀',
      title: 'Extract Fresh',
      description: 'Start a new extraction with current settings, treating as a new URL.'
    },
    {
      action: 'update' as const,
      icon: '🔄',
      title: 'Update Existing',
      description: 'Re-extract to update the existing content with latest data.'
    },
    {
      action: 'retry' as const,
      icon: '⚡',
      title: 'Retry Failed',
      description: 'Retry the previous failed extraction with same parameters.',
      disabled: history.lastStatus !== 'failed'
    }
  ];

  return (
    <AnimatePresence>
      <PromptOverlay
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && handleSkip()}
      >
        <PromptCard
          as={motion.div}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PromptTitle>URL Previously Extracted</PromptTitle>
          
          <UrlDisplay>{sourceUrl}</UrlDisplay>

          <HistorySummary>
            <SummaryGrid>
              <SummaryItem>
                <SummaryValue>{history.extractionCount}</SummaryValue>
                <SummaryLabel>Times Extracted</SummaryLabel>
              </SummaryItem>
              <SummaryItem>
                <SummaryValue>{formatLastExtracted(history.lastExtracted)}</SummaryValue>
                <SummaryLabel>Last Extraction</SummaryLabel>
              </SummaryItem>
            </SummaryGrid>

            {history.lastStatus && (
              <StatusIndicator $status={history.lastStatus}>
                Last extraction {history.lastStatus}
              </StatusIndicator>
            )}
          </HistorySummary>

          <ActionGrid>
            {actionOptions.map((option) => (
              <ActionCard
                key={option.action}
                $recommended={option.action === recommendedAction}
                onClick={() => !option.disabled && handleActionSelect(option.action)}
                whileHover={!option.disabled ? { scale: 1.02 } : {}}
                whileTap={!option.disabled ? { scale: 0.98 } : {}}
                style={{ 
                  opacity: option.disabled ? 0.5 : 1,
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  background: selectedAction === option.action ? `${theme.colors.accent}20` : undefined,
                  borderColor: selectedAction === option.action ? theme.colors.accent : undefined
                }}
              >
                <ActionIcon>{option.icon}</ActionIcon>
                <ActionTitle>{option.title}</ActionTitle>
                <ActionDescription>{option.description}</ActionDescription>
                {option.action === recommendedAction && (
                  <RecommendedBadge>Recommended</RecommendedBadge>
                )}
              </ActionCard>
            ))}
          </ActionGrid>

          <ButtonRow>
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAction}
            >
              Proceed with {selectedAction ? actionOptions.find(o => o.action === selectedAction)?.title : 'Selection'}
            </Button>
          </ButtonRow>
        </PromptCard>
      </PromptOverlay>
    </AnimatePresence>
  );
}

export default HistoryDecisionPrompt;