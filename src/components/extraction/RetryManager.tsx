import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UseExtractionHistoryReturn } from '@/hooks/useExtractionHistory';
import { RetryableUrl } from '@/types/sitemap';

interface RetryManagerProps {
  historyHook: UseExtractionHistoryReturn;
  onRetryCreated?: (sessionId: string) => void;
  className?: string;
}

const ManagerCard = styled(Card)`
  padding: ${theme.spacing.xl};
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

const FilterSection = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
  align-items: center;
`;

const FilterSelect = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  background: ${theme.colors.bg.secondary};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
  }
`;

const RetryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const RetryItem = styled(motion.div)<{ $selected: boolean }>`
  background: ${({ $selected }) => $selected ? `${theme.colors.accent}10` : theme.colors.bg.secondary};
  border: 2px solid ${({ $selected }) => $selected ? theme.colors.accent : theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.md};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${theme.colors.accent};
    transform: translateY(-1px);
  }
`;

const RetryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const RetryUrl = styled.div`
  font-family: monospace;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  word-break: break-all;
  flex: 1;
  margin-right: ${theme.spacing.md};
`;

const RetryBadge = styled.span<{ $type: 'error' | 'retry' | 'session' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  background: ${({ $type }) => {
    switch ($type) {
      case 'error': return `${theme.colors.error}20`;
      case 'retry': return `${theme.colors.info}20`;
      case 'session': return `${theme.colors.success}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'error': return theme.colors.error;
      case 'retry': return theme.colors.info;
      case 'session': return theme.colors.success;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const RetryDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const DetailLabel = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ErrorMessage = styled.div`
  background: ${theme.colors.error}10;
  border: 1px solid ${theme.colors.error}40;
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.error};
`;

const SelectionSummary = styled.div`
  background: ${theme.colors.bg.secondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  text-align: center;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: space-between;
  flex-wrap: wrap;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
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

export function RetryManager({
  historyHook,
  onRetryCreated,
  className
}: RetryManagerProps) {
  const { retryableUrls, loadRetryableUrls, createRetry } = historyHook;
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [errorCodeFilter, setErrorCodeFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [isCreatingRetry, setIsCreatingRetry] = useState(false);

  useEffect(() => {
    loadRetryableUrls({ limit: 50 });
  }, [loadRetryableUrls]);

  const filteredUrls = retryableUrls.data.filter(url => {
    if (errorCodeFilter && url.errorCode !== errorCodeFilter) return false;
    if (sessionFilter && url.sessionId !== sessionFilter) return false;
    return true;
  });

  const uniqueErrorCodes = [...new Set(retryableUrls.data.map(url => url.errorCode))];
  const uniqueSessions = [...new Set(retryableUrls.data.map(url => ({
    id: url.sessionId,
    name: url.sessionName
  })).map(s => JSON.stringify(s)))].map(s => JSON.parse(s));

  const handleUrlToggle = (extractionId: string) => {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(extractionId)) {
      newSelection.delete(extractionId);
    } else {
      newSelection.add(extractionId);
    }
    setSelectedUrls(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedUrls(new Set(filteredUrls.map(url => url.extractionId)));
  };

  const handleSelectNone = () => {
    setSelectedUrls(new Set());
  };

  const handleCreateRetry = async () => {
    if (selectedUrls.size === 0) return;

    setIsCreatingRetry(true);
    try {
      const result = await createRetry(Array.from(selectedUrls));
      setSelectedUrls(new Set());
      onRetryCreated?.(result.session.id);
      await loadRetryableUrls({ limit: 50 }); // Refresh the list
    } catch (error) {
      console.error('Failed to create retry session:', error);
    } finally {
      setIsCreatingRetry(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ManagerCard className={className}>
      <CardHeader>
        <CardTitle>
          <CardIcon>⚡</CardIcon>
          Retry Failed Extractions
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadRetryableUrls({ limit: 50 })}
          disabled={retryableUrls.loading}
        >
          {retryableUrls.loading ? <LoadingSpinner /> : '🔄'}
        </Button>
      </CardHeader>

      <FilterSection>
        <FilterSelect
          value={errorCodeFilter}
          onChange={(e) => setErrorCodeFilter(e.target.value)}
        >
          <option value="">All Error Types</option>
          {uniqueErrorCodes.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
        >
          <option value="">All Sessions</option>
          {uniqueSessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
        </FilterSelect>
      </FilterSection>

      {filteredUrls.length > 0 && (
        <SelectionSummary>
          {selectedUrls.size} of {filteredUrls.length} URLs selected for retry
        </SelectionSummary>
      )}

      {retryableUrls.loading && retryableUrls.data.length === 0 && (
        <EmptyState>
          <LoadingSpinner style={{ margin: '0 auto' }} />
          <p>Loading retryable URLs...</p>
        </EmptyState>
      )}

      {!retryableUrls.loading && filteredUrls.length === 0 && (
        <EmptyState>
          <EmptyIcon>✨</EmptyIcon>
          <p>No failed extractions found</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            All extractions completed successfully or no extractions have been performed yet.
          </p>
        </EmptyState>
      )}

      {filteredUrls.length > 0 && (
        <>
          <RetryList>
            <AnimatePresence>
              {filteredUrls.map((url) => (
                <RetryItem
                  key={url.extractionId}
                  $selected={selectedUrls.has(url.extractionId)}
                  onClick={() => handleUrlToggle(url.extractionId)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <RetryHeader>
                    <RetryUrl>{url.url}</RetryUrl>
                    <RetryBadge $type="error">{url.errorCode}</RetryBadge>
                  </RetryHeader>

                  <RetryDetails>
                    <DetailItem>
                      <DetailValue>{url.retryCount}</DetailValue>
                      <DetailLabel>Retries</DetailLabel>
                    </DetailItem>
                    <DetailItem>
                      <DetailValue>{formatDate(url.createdAt)}</DetailValue>
                      <DetailLabel>Failed</DetailLabel>
                    </DetailItem>
                    {url.lastRetryAt && (
                      <DetailItem>
                        <DetailValue>{formatDate(url.lastRetryAt)}</DetailValue>
                        <DetailLabel>Last Retry</DetailLabel>
                      </DetailItem>
                    )}
                  </RetryDetails>

                  {url.errorMessage && (
                    <ErrorMessage>
                      {url.errorMessage}
                    </ErrorMessage>
                  )}
                </RetryItem>
              ))}
            </AnimatePresence>
          </RetryList>

          <ActionButtons>
            <ButtonGroup>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedUrls.size === filteredUrls.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectNone}
                disabled={selectedUrls.size === 0}
              >
                Select None
              </Button>
            </ButtonGroup>

            <Button
              onClick={handleCreateRetry}
              disabled={selectedUrls.size === 0 || isCreatingRetry}
            >
              {isCreatingRetry ? (
                <>
                  <LoadingSpinner style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Creating Retry Session...
                </>
              ) : (
                `Create Retry Session (${selectedUrls.size})`
              )}
            </Button>
          </ActionButtons>
        </>
      )}
    </ManagerCard>
  );
}

export default RetryManager;