import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import { TextAnalysisResult } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { analyzeText, getSampleTexts } from '@/utils/textUtils';

const AnalyzerContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const InputSection = styled(Card)`
  height: fit-content;
`;

const SectionTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 300px;
  background: ${theme.colors.bg.primary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-family: ${theme.typography.fontFamily.primary};
  font-size: ${theme.typography.fontSize.base};
  line-height: 1.5;
  resize: vertical;
  transition: border-color ${theme.animation.transition.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
  }

  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

const SampleButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.md} 0;
`;

const SampleButton = styled(Button)`
  font-size: ${theme.typography.fontSize.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
`;

const AnalyzeButton = styled(Button)`
  width: 100%;
  margin-top: ${theme.spacing.md};
`;

const ResultsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const ResultCard = styled(Card)`
  padding: ${theme.spacing.lg};
`;

const SentimentIndicator = styled.div<{ $sentiment: 'positive' | 'negative' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  background: ${({ $sentiment }) => {
    switch ($sentiment) {
      case 'positive': return `${theme.colors.success}20`;
      case 'negative': return `${theme.colors.error}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  
  color: ${({ $sentiment }) => {
    switch ($sentiment) {
      case 'positive': return theme.colors.success;
      case 'negative': return theme.colors.error;
      default: return theme.colors.text.secondary;
    }
  }};
  
  border: 1px solid ${({ $sentiment }) => {
    switch ($sentiment) {
      case 'positive': return `${theme.colors.success}40`;
      case 'negative': return `${theme.colors.error}40`;
      default: return `${theme.colors.border}40`;
    }
  }};
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const MetricItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.bg.primary};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
`;

const MetricValue = styled.div`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const MetricLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const KeywordList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

const KeywordTag = styled.div<{ $relevance: number }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.bg.primary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  opacity: ${({ $relevance }) => Math.max(0.5, $relevance * 20)};
  
  &:hover {
    border-color: ${theme.colors.accent};
    opacity: 1;
  }
`;

const EntityList = styled.div`
  margin-top: ${theme.spacing.md};
`;

const EntityItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border}20;
  
  &:last-child {
    border-bottom: none;
  }
`;

const EntityText = styled.span`
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.bold};
`;

const EntityType = styled.span<{ $type: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  background: ${({ $type }) => {
    switch ($type) {
      case 'person': return `${theme.colors.info}20`;
      case 'organization': return `${theme.colors.warning}20`;
      case 'location': return `${theme.colors.success}20`;
      default: return `${theme.colors.border}20`;
    }
  }};
  
  color: ${({ $type }) => {
    switch ($type) {
      case 'person': return theme.colors.info;
      case 'organization': return theme.colors.warning;
      case 'location': return theme.colors.success;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${theme.colors.bg.secondary}90;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.layout.borderRadius.default};
  z-index: 10;
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid ${theme.colors.border};
  border-top: 3px solid ${theme.colors.accent};
  border-radius: 50%;
`;

interface TextAnalyzerProps {
  className?: string;
}

const TextAnalyzer: React.FC<TextAnalyzerProps> = ({ className }) => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<TextAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const sampleTexts = getSampleTexts();

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = analyzeText(text);
    setAnalysis(result);
    setLoading(false);
  };

  const loadSampleText = (type: string) => {
    setText(sampleTexts[type]);
    setAnalysis(null);
  };

  // Auto-analyze when text changes (debounced)
  useEffect(() => {
    if (text.trim().length > 10) {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [text]);

  const getSentimentIcon = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const formatScore = (score: number) => {
    return score > 0 ? `+${score.toFixed(3)}` : score.toFixed(3);
  };

  return (
    <AnalyzerContainer className={className}>
      {/* Input Section */}
      <InputSection>
        <SectionTitle>Text Input</SectionTitle>
        
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here for analysis. You can paste articles, reviews, social media posts, or any text content you'd like to analyze for sentiment, keywords, and readability..."
        />
        
        <SampleButtons>
          <SampleButton
            variant="ghost"
            size="sm"
            onClick={() => loadSampleText('positive')}
          >
            Positive Sample
          </SampleButton>
          <SampleButton
            variant="ghost"
            size="sm"
            onClick={() => loadSampleText('negative')}
          >
            Negative Sample
          </SampleButton>
          <SampleButton
            variant="ghost"
            size="sm"
            onClick={() => loadSampleText('neutral')}
          >
            Neutral Sample
          </SampleButton>
          <SampleButton
            variant="ghost"
            size="sm"
            onClick={() => loadSampleText('technical')}
          >
            Technical
          </SampleButton>
        </SampleButtons>
        
        <AnalyzeButton
          onClick={handleAnalyze}
          disabled={!text.trim() || loading}
          loading={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Text'}
        </AnalyzeButton>
      </InputSection>

      {/* Results Section */}
      <ResultsSection>
        {loading && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSpinner
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </LoadingOverlay>
        )}

        {analysis && (
          <>
            {/* Sentiment Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ResultCard>
                <SectionTitle>Sentiment Analysis</SectionTitle>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                  <SentimentIndicator $sentiment={analysis.sentiment.label}>
                    {getSentimentIcon(analysis.sentiment.label)}
                    {analysis.sentiment.label}
                  </SentimentIndicator>
                  <span style={{ color: theme.colors.text.secondary }}>
                    Score: {formatScore(analysis.sentiment.score)}
                  </span>
                </div>
                
                <MetricGrid>
                  <MetricItem>
                    <MetricValue>{analysis.sentiment.label.toUpperCase()}</MetricValue>
                    <MetricLabel>Sentiment</MetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <MetricValue>{formatScore(analysis.sentiment.score)}</MetricValue>
                    <MetricLabel>Score</MetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <MetricValue>{(analysis.sentiment.confidence * 100).toFixed(1)}%</MetricValue>
                    <MetricLabel>Confidence</MetricLabel>
                  </MetricItem>
                </MetricGrid>
              </ResultCard>
            </motion.div>

            {/* Keywords */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ResultCard>
                <SectionTitle>Keywords ({analysis.keywords.length})</SectionTitle>
                
                {analysis.keywords.length > 0 ? (
                  <KeywordList>
                    {analysis.keywords.map((keyword, index) => (
                      <KeywordTag
                        key={index}
                        $relevance={keyword.relevance}
                        title={`Frequency: ${keyword.frequency}, Relevance: ${(keyword.relevance * 100).toFixed(2)}%`}
                      >
                        {keyword.word} ({keyword.frequency})
                      </KeywordTag>
                    ))}
                  </KeywordList>
                ) : (
                  <p style={{ color: theme.colors.text.secondary, fontStyle: 'italic' }}>
                    No significant keywords found.
                  </p>
                )}
              </ResultCard>
            </motion.div>

            {/* Entities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ResultCard>
                <SectionTitle>Named Entities ({analysis.entities?.length || 0})</SectionTitle>
                
                {analysis.entities && analysis.entities.length > 0 ? (
                  <EntityList>
                    {analysis.entities.map((entity, index) => (
                      <EntityItem key={index}>
                        <EntityText>{entity.text}</EntityText>
                        <EntityType $type={entity.type}>{entity.type}</EntityType>
                      </EntityItem>
                    ))}
                  </EntityList>
                ) : (
                  <p style={{ color: theme.colors.text.secondary, fontStyle: 'italic' }}>
                    No named entities detected.
                  </p>
                )}
              </ResultCard>
            </motion.div>

            {/* Readability */}
            {analysis.readability && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <ResultCard>
                  <SectionTitle>Readability</SectionTitle>
                  
                  <MetricGrid>
                    <MetricItem>
                      <MetricValue>{analysis.readability.score}</MetricValue>
                      <MetricLabel>Score</MetricLabel>
                    </MetricItem>
                    <MetricItem>
                      <MetricValue>{analysis.readability.level}</MetricValue>
                      <MetricLabel>Level</MetricLabel>
                    </MetricItem>
                    <MetricItem>
                      <MetricValue>{text.split(/\s+/).length}</MetricValue>
                      <MetricLabel>Words</MetricLabel>
                    </MetricItem>
                    <MetricItem>
                      <MetricValue>{text.split(/[.!?]+/).filter(s => s.trim().length > 0).length}</MetricValue>
                      <MetricLabel>Sentences</MetricLabel>
                    </MetricItem>
                  </MetricGrid>
                </ResultCard>
              </motion.div>
            )}
          </>
        )}

        {!analysis && !loading && (
          <ResultCard>
            <SectionTitle>Results</SectionTitle>
            <p style={{ color: theme.colors.text.secondary, textAlign: 'center', padding: theme.spacing.xl }}>
              Enter text above to see analysis results
            </p>
          </ResultCard>
        )}
      </ResultsSection>
    </AnalyzerContainer>
  );
};

export default TextAnalyzer;