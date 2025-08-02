import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Card from '@/components/ui/Card';
import SitemapExtractor from '@/components/sitemap/SitemapExtractor';

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
  
  &.extraction { color: ${theme.colors.accent}; }
  &.categorization { color: ${theme.colors.info}; }
  &.processing { color: ${theme.colors.success}; }
  &.export { color: ${theme.colors.warning}; }
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


const SitemapAnalysis: React.FC = () => {
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
            SITEMAP ANALYSIS
          </PageTitle>
          <PageSubtitle variants={itemVariants}>
            Advanced sitemap extraction and link categorization with intelligent content processing
            and batch markdown conversion for comprehensive website analysis
          </PageSubtitle>
        </PageHeader>

        {/* Features Overview */}
        <FeaturesSection>
          <SectionTitle variants={itemVariants}>
            EXTRACTION CAPABILITIES
          </SectionTitle>
          
          <FeaturesGrid>
            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="extraction">🗂️</FeatureIcon>
                <FeatureTitle>Sitemap Extraction</FeatureTitle>
                <FeatureDescription>
                  Automatically discover and extract all links from website sitemaps.
                  Process XML sitemaps and HTML site indexes with intelligent parsing.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="categorization">🏷️</FeatureIcon>
                <FeatureTitle>Link Categorization</FeatureTitle>
                <FeatureDescription>
                  Intelligent classification of extracted links into categories:
                  internal, external, files, email addresses, phone numbers, and anchors.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="processing">⚙️</FeatureIcon>
                <FeatureTitle>Content Processing</FeatureTitle>
                <FeatureDescription>
                  Batch processing of selected pages with content extraction,
                  HTML parsing, and intelligent text cleaning for analysis.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureCard>
                <FeatureIcon className="export">📁</FeatureIcon>
                <FeatureTitle>Export Formats</FeatureTitle>
                <FeatureDescription>
                  Multiple export options including Markdown, JSON, CSV, and XML.
                  Custom templates and bulk download for research and documentation.
                </FeatureDescription>
              </FeatureCard>
            </motion.div>
          </FeaturesGrid>
        </FeaturesSection>

        {/* Sitemap Analyzer */}
        <AnalysisSection>
          <SectionTitle variants={itemVariants}>
            LIVE SITEMAP ANALYZER
          </SectionTitle>
          
          <motion.div variants={itemVariants}>
            <SitemapExtractor />
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
                  <InfoItem>XML sitemap parsing with schema validation</InfoItem>
                  <InfoItem>URL pattern recognition and classification algorithms</InfoItem>
                  <InfoItem>Concurrent content extraction with rate limiting</InfoItem>
                  <InfoItem>HTML content cleaning and text extraction</InfoItem>
                  <InfoItem>Link relationship mapping and dependency analysis</InfoItem>
                  <InfoItem>Metadata extraction including last modified dates</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Use Cases</InfoTitle>
                <InfoList>
                  <InfoItem>SEO audits and website structure analysis</InfoItem>
                  <InfoItem>Content migration and website archival projects</InfoItem>
                  <InfoItem>Competitive analysis and market research</InfoItem>
                  <InfoItem>Link building and content discovery workflows</InfoItem>
                  <InfoItem>Documentation generation from existing websites</InfoItem>
                  <InfoItem>Website crawling and data extraction automation</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Technology Stack</InfoTitle>
                <p style={{ color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                  Built with modern web technologies for efficient sitemap processing:
                </p>
                <TechStack>
                  <TechTag>React 18</TechTag>
                  <TechTag>TypeScript</TechTag>
                  <TechTag>Firecrawl API</TechTag>
                  <TechTag>XML Processing</TechTag>
                  <TechTag>URL Analysis</TechTag>
                  <TechTag>Batch Processing</TechTag>
                  <TechTag>File Generation</TechTag>
                  <TechTag>Emotion React</TechTag>
                </TechStack>
              </InfoCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InfoCard>
                <InfoTitle>Performance Features</InfoTitle>
                <InfoList>
                  <InfoItem>Concurrent processing with configurable limits</InfoItem>
                  <InfoItem>Progress tracking for long-running operations</InfoItem>
                  <InfoItem>Error handling and retry mechanisms</InfoItem>
                  <InfoItem>Memory-efficient streaming for large sitemaps</InfoItem>
                  <InfoItem>Real-time progress updates and cancellation support</InfoItem>
                  <InfoItem>Responsive design optimized for all devices</InfoItem>
                </InfoList>
              </InfoCard>
            </motion.div>
          </InfoGrid>
        </InfoSection>
      </motion.div>
    </PageContainer>
  );
};

export default SitemapAnalysis;