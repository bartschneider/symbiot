'use client';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useSitemapDiscovery } from '@/hooks/useSitemapDiscovery';
import { useSelection } from '@/hooks/useSelection';
import { useContentExtraction } from '@/hooks/useContentExtraction';
import { ApiError } from '@/types/sitemap';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { downloadExtractionResults, downloadExtractionResultsAsJson } from '@/utils/downloadUtils';
import HistoryChecker from '@/components/extraction/HistoryChecker';
import HistoryDecisionPrompt from '@/components/extraction/HistoryDecisionPrompt';
import HistoryStatusCard from '@/components/extraction/HistoryStatusCard';
import SessionTracker from '@/components/extraction/SessionTracker';
import LinkList from '@/components/sitemap/LinkList';
import {
  SitemapDiscoveryRequest,
  LinkCategory,
  ExtractionHistory,
  UserDecision
} from '@/types/sitemap';

interface SitemapExtractorProps {
  className?: string;
}

interface LoadingState {
  isLoading: boolean;
  stage: 'idle' | 'fetching' | 'processing' | 'categorizing' | 'complete';
  progress: number;
  message: string;
}

const Container = styled.div`
  min-height: 100vh;
  background: ${theme.colors.bg.secondary};
  padding: ${theme.spacing.lg};
`;

const Section = styled.section`
  margin-bottom: ${theme.spacing.xxl};
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled(motion.h1)`
  font-size: ${theme.typography.fontSize['4xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  text-align: center;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const Subtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.text.secondary};
  text-align: center;
  max-width: 700px;
  margin: 0 auto ${theme.spacing.xl};
  line-height: 1.6;
`;

const InputSection = styled(Card)`
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
`;

const InputContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const UrlInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  background: ${theme.colors.bg.primary};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.base};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 2px ${theme.colors.accent}20;
  }
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

const ValidationMessage = styled.div<{ $type: 'error' | 'success' | 'info' }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.sm};
  
  ${({ $type }) => {
    switch ($type) {
      case 'error':
        return `
          background: ${theme.colors.error}20;
          border: 1px solid ${theme.colors.error}40;
          color: ${theme.colors.error};
        `;
      case 'success':
        return `
          background: ${theme.colors.success}20;
          border: 1px solid ${theme.colors.success}40;
          color: ${theme.colors.success};
        `;
      case 'info':
        return `
          background: ${theme.colors.info}20;
          border: 1px solid ${theme.colors.info}40;
          color: ${theme.colors.info};
        `;
      default:
        return '';
    }
  }}
`;

const LoadingCard = styled(Card)`
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${theme.colors.bg.primary};
  border-radius: ${theme.layout.borderRadius.lg};
  overflow: hidden;
  margin: ${theme.spacing.md} 0;
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.info});
  border-radius: ${theme.layout.borderRadius.lg};
  width: ${({ $progress }) => $progress}%;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

const StatCard = styled(Card)`
  padding: ${theme.spacing.lg};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

const CategoryCard = styled(Card)`
  padding: ${theme.spacing.lg};
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: ${theme.spacing.md};
`;

const CategoryIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.layout.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-right: ${theme.spacing.md};
`;

const CategoryTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0;
`;

const CategoryCount = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-left: auto;
`;

const ActionSection = styled(Card)`
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;


const CATEGORY_INFO = {
  internal: { icon: '🏠', color: '#68FFC9', label: 'Internal Links' },
  external: { icon: '🌐', color: '#FFB800', label: 'External Links' },
  files: { icon: '📄', color: '#FF3D71', label: 'File Downloads' },
  email: { icon: '📧', color: '#1E86FF', label: 'Email Links' },
  phone: { icon: '📞', color: '#9C27B0', label: 'Phone Numbers' },
  anchors: { icon: '#️⃣', color: '#4CAF50', label: 'Page Anchors' }
} as const;

export function SitemapExtractor({ className }: SitemapExtractorProps) {
  const [url, setUrl] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    stage: 'idle',
    progress: 0,
    message: 'Ready to extract sitemap'
  });
  const [showDecisionPrompt, setShowDecisionPrompt] = useState(false);
  const [currentHistory, setCurrentHistory] = useState<ExtractionHistory | null>(null);

  // Hooks
  const sitemapDiscovery = useSitemapDiscovery({
    onSuccess: (result) => {
      setLoadingState({
        isLoading: false,
        stage: 'complete',
        progress: 100,
        message: `Found ${result.data.summary.totalLinks} links`
      });
    },
    onError: (error) => {
      setLoadingState({
        isLoading: false,
        stage: 'idle',
        progress: 0,
        message: error.message
      });
    }
  });

  const selection = useSelection(sitemapDiscovery.linkData);
  
  // Create a ref to avoid circular dependency with handleContentExtraction
  const handleContentExtractionRef = useRef<(() => Promise<void>) | null>(null);
  
  const historyHook = useExtractionHistory({
    onDecision: useCallback((decision: UserDecision) => {
      setShowDecisionPrompt(false);
      // Proceed with extraction based on decision
      if (decision.action !== 'skip' && handleContentExtractionRef.current) {
        handleContentExtractionRef.current();
      }
    }, []),
    onError: useCallback((error: ApiError) => {
      console.error('History error:', error);
    }, [])
  });
  
  const contentExtraction = useContentExtraction({
    onSuccess: (result) => {
      // console.log('Content extraction completed'); // Disabled to prevent console overflow
      
      // Trigger automatic download for batch results
      try {
        if ('data' in result && result.data.results) {
          // This is a BatchScrapingResult
          downloadExtractionResults(result.data.results, url.trim());
          // console.log('Automatic download triggered'); // Disabled to prevent console overflow
        }
      } catch (error) {
        console.error('Failed to trigger download:', error);
      }
    },
    onError: (error) => {
      console.error('Content extraction failed:', error);
    }
  });

  // URL input handler
  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return;

    setLoadingState({
      isLoading: true,
      stage: 'fetching',
      progress: 25,
      message: 'Fetching sitemap data...'
    });

    try {
      // Simulate progressive loading stages
      setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          stage: 'processing',
          progress: 50,
          message: 'Processing sitemap entries...'
        }));
      }, 1000);

      setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          stage: 'categorizing',
          progress: 75,
          message: 'Categorizing links...'
        }));
      }, 2000);

      const request: SitemapDiscoveryRequest = {
        url: url.trim(),
        includeExternal: true,
        followRedirects: true,
        timeout: 30000
      };

      await sitemapDiscovery.discoverSitemap(request);
    } catch (error) {
      console.error('Sitemap discovery failed:', error);
    }
  }, [url, sitemapDiscovery]);

  // Handle history-based decision for extraction
  const handleHistoryLoaded = useCallback((history: ExtractionHistory) => {
    setCurrentHistory(history);
    if (historyHook.needsDecision(history)) {
      setShowDecisionPrompt(true);
    }
  }, [historyHook]);

  // Handle content extraction
  const handleContentExtraction = useCallback(async () => {
    const selectedUrls = selection.selectedUrls;
    // console.log('Content extraction called with URLs:', selectedUrls.length, selectedUrls); // Disabled to prevent console overflow
    if (selectedUrls.length === 0) {
      // console.log('No URLs selected, returning early'); // Disabled to prevent console overflow
      return;
    }

    try {
      await contentExtraction.batchExtract({
        urls: selectedUrls,
        options: {
          includeImages: true,
          includeTables: true,
          removeCodeBlocks: false,
          waitForLoad: 2000,
          maxConcurrent: 5
        }
      });
    } catch (error) {
      console.error('Content extraction failed:', error);
    }
  }, [selection.selectedUrls, contentExtraction]);

  // Update the ref whenever handleContentExtraction changes
  // Removed problematic useEffect that caused infinite re-renders
  handleContentExtractionRef.current = handleContentExtraction;

  // Check for history decision before extraction
  const handleContentExtractionWithHistory = useCallback(async () => {
    if (currentHistory && historyHook.needsDecision(currentHistory)) {
      setShowDecisionPrompt(true);
    } else {
      await handleContentExtraction();
    }
  }, [currentHistory, historyHook, handleContentExtraction]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Render extraction progress using SessionTracker
  const renderExtractionProgress = useMemo(() => {
    if (!contentExtraction.loading || !contentExtraction.progress) return null;

    return (
      <SessionTracker
        extractionHook={contentExtraction}
        userDecision={historyHook.historyState.decision || undefined}
        sessionName={`Extraction - ${new Date().toLocaleDateString()}`}
      />
    );
  }, [contentExtraction.loading, contentExtraction.progress, contentExtraction, historyHook.historyState.decision]);

  // Render category cards
  const renderCategoryCards = useMemo(() => {
    if (!sitemapDiscovery.hasResult) return null;

    const categories: LinkCategory[] = ['internal', 'external', 'files', 'email', 'phone', 'anchors'];
    const visibleCategories = categories.filter(cat => 
      selection.getLinksByCategory(cat).length > 0
    );

    return (
      <CategoryGrid>
        {visibleCategories.map((category) => {
          const categoryInfo = CATEGORY_INFO[category];
          const links = selection.getLinksByCategory(category);
          const selectedLinks = selection.getSelectedLinksByCategory(category);
          
          return (
            <motion.div key={category} variants={itemVariants}>
              <CategoryCard hover>
                <CategoryHeader>
                  <CategoryIcon style={{ backgroundColor: `${categoryInfo.color}20` }}>
                    {categoryInfo.icon}
                  </CategoryIcon>
                  <div>
                    <CategoryTitle>{categoryInfo.label}</CategoryTitle>
                    <CategoryCount>
                      {selectedLinks.length} / {links.length} selected
                    </CategoryCount>
                  </div>
                </CategoryHeader>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selection.toggleCategory(category)}
                >
                  {selection.getCategoryState(category).selected ? 'Deselect All' : 'Select All'}
                </Button>
                <LinkList
                  links={links}
                  selectedLinks={new Set(selection.selectedLinks)}
                  onToggleLink={selection.toggleLink}
                  category={category}
                  maxVisible={5}
                />
              </CategoryCard>
            </motion.div>
          );
        })}
      </CategoryGrid>
    );
  }, [sitemapDiscovery.hasResult, selection]);

  return (
    <Container className={className}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <Section>
          <Title variants={itemVariants}>
            Sitemap Link Extractor
          </Title>
          <Subtitle variants={itemVariants}>
            Extract and categorize all links from any website's sitemap.
            Select specific links for content processing and markdown conversion.
          </Subtitle>
        </Section>

        {/* URL Input */}
        <Section>
          <motion.div variants={itemVariants}>
            <InputSection>
              <InputContainer>
                <UrlInput
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loadingState.isLoading}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={loadingState.isLoading || !url.trim()}
                >
                  {loadingState.isLoading ? 'Processing...' : 'Extract Links'}
                </Button>
              </InputContainer>

              {sitemapDiscovery.urlValidation.message && (
                <ValidationMessage 
                  $type={sitemapDiscovery.urlValidation.valid ? 'success' : 'error'}
                >
                  {sitemapDiscovery.urlValidation.message}
                </ValidationMessage>
              )}

              {sitemapDiscovery.error && (
                <ValidationMessage $type="error">
                  {sitemapDiscovery.error.message}
                </ValidationMessage>
              )}
            </InputSection>
          </motion.div>
        </Section>

        {/* History Checker */}
        {url.trim() && (
          <Section>
            <motion.div variants={itemVariants}>
              <HistoryChecker
                url={url.trim()}
                onHistoryLoaded={handleHistoryLoaded}
                historyHook={historyHook}
              />
            </motion.div>
          </Section>
        )}

        {/* History Status Card */}
        {url.trim() && (
          <Section>
            <motion.div variants={itemVariants}>
              <HistoryStatusCard
                sourceUrl={url.trim()}
                historyHook={historyHook}
              />
            </motion.div>
          </Section>
        )}

        {/* Loading */}
        {loadingState.isLoading && (
          <Section>
            <motion.div variants={itemVariants}>
              <LoadingCard>
                <h3>Processing Sitemap</h3>
                <p>{loadingState.message}</p>
                <ProgressBar>
                  <ProgressFill 
                    $progress={loadingState.progress}
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingState.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </ProgressBar>
                <p>{loadingState.progress}% complete</p>
              </LoadingCard>
            </motion.div>
          </Section>
        )}

        {/* Statistics */}
        {sitemapDiscovery.hasResult && (
          <Section>
            <motion.div variants={itemVariants}>
              <StatsGrid>
                <StatCard>
                  <StatValue>{selection.totalLinks}</StatValue>
                  <StatLabel>Total Links</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{selection.selectedCount}</StatValue>
                  <StatLabel>Selected</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{selection.selectionPercentage}%</StatValue>
                  <StatLabel>Coverage</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>
                    {Object.keys(sitemapDiscovery.result?.data.categories || {}).length}
                  </StatValue>
                  <StatLabel>Categories</StatLabel>
                </StatCard>
              </StatsGrid>
            </motion.div>
          </Section>
        )}

        {/* Category Selection */}
        {sitemapDiscovery.hasResult && (
          <Section>
            <motion.div variants={itemVariants}>
              {renderCategoryCards}
            </motion.div>
          </Section>
        )}

        {/* Content Extraction Progress */}
        {contentExtraction.loading && (
          <Section>
            <motion.div variants={itemVariants}>
              {renderExtractionProgress}
            </motion.div>
          </Section>
        )}

        {/* Actions */}
        {selection.hasSelection && !contentExtraction.loading && (
          <Section>
            <motion.div variants={itemVariants}>
              <ActionSection>
                <h3>Extract Content</h3>
                <p>
                  Ready to extract content from {selection.selectedCount} selected pages.
                  This will convert each page to markdown format.
                </p>
                <ButtonGroup>
                  <Button onClick={selection.selectAll} variant="secondary">
                    Select All
                  </Button>
                  <Button onClick={selection.selectNone} variant="ghost">
                    Clear Selection
                  </Button>
                  <Button 
                    onClick={handleContentExtractionWithHistory}
                    disabled={contentExtraction.loading || selection.selectedCount === 0}
                  >
                    Extract Content
                  </Button>
                </ButtonGroup>
              </ActionSection>
            </motion.div>
          </Section>
        )}

        {/* Extraction Results */}
        {contentExtraction.hasResults && !contentExtraction.loading && (
          <Section>
            <motion.div variants={itemVariants}>
              <ActionSection>
                <h3>Extraction Complete</h3>
                <p>
                  Successfully processed {contentExtraction.successfulResults} of {contentExtraction.results.length} pages.
                  {contentExtraction.failedResults > 0 && (
                    ` ${contentExtraction.failedResults} pages failed to process.`
                  )}
                </p>
                <p style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
                  Your markdown file should have downloaded automatically. If not, use the download buttons below.
                </p>
                <ButtonGroup>
                  <Button 
                    onClick={() => downloadExtractionResults(contentExtraction.results, url.trim())}
                    variant="primary"
                  >
                    📄 Download Markdown
                  </Button>
                  <Button 
                    onClick={() => downloadExtractionResultsAsJson(contentExtraction.results, url.trim())}
                    variant="secondary"
                  >
                    📊 Download JSON
                  </Button>
                  {contentExtraction.canRetry && (
                    <Button onClick={contentExtraction.retry} variant="secondary">
                      🔄 Retry Failed
                    </Button>
                  )}
                  <Button onClick={contentExtraction.clear} variant="ghost">
                    🗑️ Clear Results
                  </Button>
                </ButtonGroup>
              </ActionSection>
            </motion.div>
          </Section>
        )}

        {/* History Decision Prompt */}
        {showDecisionPrompt && currentHistory && (
          <HistoryDecisionPrompt
            history={currentHistory}
            sourceUrl={url.trim()}
            onDecision={(decision) => historyHook.makeDecision(decision.action, decision.sourceUrl)}
            historyHook={historyHook}
          />
        )}
      </motion.div>
    </Container>
  );
}

export default SitemapExtractor;