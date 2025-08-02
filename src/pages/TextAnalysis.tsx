import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import TextAnalyzer from '@/components/text/TextAnalyzer';
import Card from '@/components/ui/Card';

const PageContainer = styled.div`
  padding: ${theme.spacing.lg} 0;
`;

const PageHeader = styled.section`
  text-align: center;
  margin-bottom: ${theme.spacing.xxl};
`;

const PageTitle = styled(motion.h1)`
  font-size: ${theme.typography.fontSize['4xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.typography.fontSize['3xl']};
  }
`;

const PageSubtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.text.secondary};
  max-width: 700px;
  margin: 0 auto ${theme.spacing.xl};
  line-height: 1.6;
`;

const FeaturesSection = styled.section`
  margin-bottom: ${theme.spacing.xxl};
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled(Card)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${theme.spacing.lg};
  
  &.sentiment { color: ${theme.colors.success}; }
  &.keywords { color: ${theme.colors.info}; }
  &.entities { color: ${theme.colors.warning}; }
  &.readability { color: ${theme.colors.accent}; }
`;

const FeatureTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
  font-size: ${theme.typography.fontSize.base};
`;

const AnalysisSection = styled.section`
  margin-bottom: ${theme.spacing.xxl};
`;

const SectionTitle = styled(motion.h2)`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
  color: ${theme.colors.text.primary};
`;

const InfoSection = styled.section`
  margin-bottom: ${theme.spacing.xxl};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const InfoCard = styled(Card)`
  padding: ${theme.spacing.xl};
`;

const InfoTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InfoItem = styled.li`
  padding: ${theme.spacing.sm} 0;
  color: ${theme.colors.text.secondary};
  border-bottom: 1px solid ${theme.colors.border}20;
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  
  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: '▸';
    color: ${theme.colors.accent};
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const TechStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

const TechTag = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.bg.primary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  
  &:hover {
    border-color: ${theme.colors.accent};
  }
`;

const TextAnalysis: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <PageContainer>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header */}
        <PageHeader>
          <PageTitle variants={itemVariants}>
            TEXT ANALYSIS
          </PageTitle>
          <PageSubtitle variants={itemVariants}>
            Natural language processing with sentiment analysis, keyword extraction, 
            named entity recognition, and readability scoring powered by advanced algorithms
          </PageSubtitle>
        </PageHeader>

        {/* Features Overview */}
        <FeaturesSection>
          <SectionTitle variants={itemVariants}>
            ANALYSIS CAPABILITIES
          </SectionTitle>
          
          <FeaturesGrid>
            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="sentiment">🎭</FeatureIcon>
                <FeatureTitle>Sentiment Analysis</FeatureTitle>
                <FeatureDescription>
                  Automatically detect the emotional tone of text content. 
                  Classify sentiment as positive, negative, or neutral with confidence scores.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="keywords">🔍</FeatureIcon>
                <FeatureTitle>Keyword Extraction</FeatureTitle>
                <FeatureDescription>
                  Identify and rank the most important keywords and phrases. 
                  Analyze word frequency and relevance to understand key topics.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="entities">🏷️</FeatureIcon>
                <FeatureTitle>Named Entities</FeatureTitle>
                <FeatureDescription>
                  Extract and classify named entities such as people, organizations, 
                  and locations from unstructured text data.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="readability">📖</FeatureIcon>
                <FeatureTitle>Readability Scoring</FeatureTitle>
                <FeatureDescription>
                  Calculate readability metrics using industry-standard algorithms. 
                  Assess text complexity and reading difficulty levels.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>
          </FeaturesGrid>
        </FeaturesSection>

        {/* Text Analyzer */}
        <AnalysisSection>
          <SectionTitle variants={itemVariants}>
            LIVE TEXT ANALYZER
          </SectionTitle>
          
          <motion.div variants={itemVariants}>
            <TextAnalyzer />
          </motion.div>
        </AnalysisSection>

        {/* Technical Information */}
        <InfoSection>
          <SectionTitle variants={itemVariants}>
            TECHNICAL DETAILS
          </SectionTitle>
          
          <InfoGrid>
            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Analysis Methods</InfoTitle>
                <InfoList>
                  <InfoItem>Lexicon-based sentiment analysis with custom word scoring</InfoItem>
                  <InfoItem>TF-IDF keyword extraction with stop-word filtering</InfoItem>
                  <InfoItem>Pattern-based named entity recognition</InfoItem>
                  <InfoItem>Flesch Reading Ease readability calculation</InfoItem>
                  <InfoItem>Statistical text metrics and frequency analysis</InfoItem>
                  <InfoItem>Multi-language support for entity detection</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Use Cases</InfoTitle>
                <InfoList>
                  <InfoItem>Social media monitoring and brand sentiment tracking</InfoItem>
                  <InfoItem>Customer feedback analysis and review processing</InfoItem>
                  <InfoItem>Content quality assessment and SEO optimization</InfoItem>
                  <InfoItem>Academic research and text mining projects</InfoItem>
                  <InfoItem>Marketing campaign effectiveness measurement</InfoItem>
                  <InfoItem>Document classification and content categorization</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Technology Stack</InfoTitle>
                <p style={{ color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                  Built with modern web technologies for fast, accurate text processing:
                </p>
                <TechStack>
                  <TechTag>React 18</TechTag>
                  <TechTag>TypeScript</TechTag>
                  <TechTag>Natural Language Processing</TechTag>
                  <TechTag>Regex Patterns</TechTag>
                  <TechTag>Statistical Analysis</TechTag>
                  <TechTag>Real-time Processing</TechTag>
                  <TechTag>Responsive Design</TechTag>
                  <TechTag>Emotion React</TechTag>
                </TechStack>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Performance Features</InfoTitle>
                <InfoList>
                  <InfoItem>Real-time analysis with debounced processing</InfoItem>
                  <InfoItem>Client-side processing for data privacy</InfoItem>
                  <InfoItem>Optimized algorithms for fast execution</InfoItem>
                  <InfoItem>Responsive design for all device types</InfoItem>
                  <InfoItem>Interactive visualizations and results</InfoItem>
                  <InfoItem>Accessibility-compliant user interface</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>
          </InfoGrid>
        </InfoSection>
      </motion.div>
    </PageContainer>
  );
};

export default TextAnalysis;