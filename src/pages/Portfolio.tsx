import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/styles/theme';
import { Project } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DitheredPattern from '@/components/ui/DitheredPattern';

const HeroSection = styled.section`
  text-align: center;
  padding: ${theme.spacing.xxl} 0;
  position: relative;
  margin-bottom: ${theme.spacing.xxl};
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.02em;
  line-height: 1.1;
  margin-bottom: ${theme.spacing.md};
  text-transform: uppercase;
  color: ${theme.colors.text.primary};
`;

const HeroSubtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.light};
  color: ${theme.colors.text.secondary};
  max-width: 600px;
  margin: 0 auto ${theme.spacing.xl};
  line-height: 1.6;
`;

const PortfolioSection = styled.section`
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

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const ProjectCard = styled(Card)`
  height: 100%;
  transition: all ${theme.animation.transition.medium};
`;

const ProjectThumbnail = styled.div`
  height: 200px;
  margin-bottom: ${theme.spacing.md};
  border-radius: ${theme.layout.borderRadius.sm};
  overflow: hidden;
  background: ${theme.colors.bg.primary};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ThumbnailContent = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
`;

const ChartPreview = styled.div<{ $type: 'grid' | 'chart' | 'text' | 'sitemap' }>`
  margin-bottom: ${theme.spacing.md};
  
  ${({ $type }) => {
    switch ($type) {
      case 'grid':
        return `
          width: 60px;
          height: 60px;
          background-image: 
            linear-gradient(0deg, ${theme.colors.border} 1px, transparent 1px),
            linear-gradient(90deg, ${theme.colors.border} 1px, transparent 1px);
          background-size: 10px 10px;
          margin: 0 auto ${theme.spacing.md};
          opacity: 0.5;
        `;
      case 'chart':
        return `
          width: 80px;
          height: 40px;
          margin: 0 auto ${theme.spacing.md};
        `;
      case 'text':
        return `
          width: 80px;
          margin: 0 auto ${theme.spacing.md};
        `;
      case 'sitemap':
        return `
          width: 80px;
          height: 60px;
          margin: 0 auto ${theme.spacing.md};
        `;
      default:
        return '';
    }
  }}
`;

const PreviewChart = styled.svg`
  width: 100%;
  height: 100%;
`;

const TextLines = styled.div`
  width: 100%;
  
  .text-line {
    height: 3px;
    background-color: ${theme.colors.accent};
    margin-bottom: 6px;
    opacity: 0.7;
    
    &.short { width: 60%; }
    &.medium { width: 80%; }
  }
`;

const PreviewTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.1em;
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const PreviewSubtitle = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const ProjectInfo = styled.div`
  margin-top: auto;
`;

const ProjectTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  margin-bottom: ${theme.spacing.xs};
  text-transform: uppercase;
  color: ${theme.colors.text.primary};
`;

const ProjectDescription = styled.p`
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.md};
  line-height: 1.5;
`;

const ProjectLink = styled(Link)`
  color: ${theme.colors.accent};
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.regular};
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  transition: all ${theme.animation.transition.fast};

  &:hover {
    gap: ${theme.spacing.sm};
  }

  .arrow {
    font-size: 1.2em;
    transition: transform ${theme.animation.transition.fast};
  }

  &:hover .arrow {
    transform: translate(2px, -2px);
  }
`;

const CTASection = styled.section`
  text-align: center;
  padding: ${theme.spacing.xxl} 0;
  border-top: 1px solid ${theme.colors.border};
  margin-bottom: ${theme.spacing.xxl};
`;

const CTATitle = styled(motion.h2)`
  font-size: ${theme.typography.fontSize['4xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.02em;
  margin-bottom: ${theme.spacing.md};
  text-transform: uppercase;
  color: ${theme.colors.text.primary};

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.typography.fontSize['3xl']};
  }
`;

const CTASubtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xl};
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const Portfolio: React.FC = () => {
  const [projects] = useState<Project[]>([
    {
      id: 'landing',
      title: 'LANDING PAGE',
      description: 'Data-driven welcome experience with intelligent onboarding flows',
      link: '/landing',
      type: 'landing',
      preview: { type: 'grid' },
    },
    {
      id: 'charts',
      title: 'CHART ANALYSIS',
      description: 'Advanced line chart visualizations with real-time data processing',
      link: '/analysis',
      type: 'charts',
      preview: { type: 'chart' },
    },
    {
      id: 'text',
      title: 'TEXT ANALYSIS',
      description: 'Natural language processing with sentiment and semantic analysis',
      link: '/text-analysis',
      type: 'text',
      preview: { type: 'text' },
    },
    {
      id: 'sitemap',
      title: 'SITEMAP ANALYSIS',
      description: 'Extract and categorize website links with intelligent content processing',
      link: '/sitemap-analysis',
      type: 'sitemap',
      preview: { type: 'sitemap' },
    },
  ]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const renderPreview = (project: Project) => {
    switch (project.preview?.type) {
      case 'chart':
        return (
          <ChartPreview $type="chart">
            <PreviewChart viewBox="0 0 100 50">
              <motion.path
                d="M10,40 Q25,20 40,30 T70,15 T90,25"
                stroke={theme.colors.accent}
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
              <motion.circle cx="40" cy="30" r="2" fill={theme.colors.accent} />
              <motion.circle cx="70" cy="15" r="2" fill={theme.colors.accent} />
            </PreviewChart>
          </ChartPreview>
        );
      case 'text':
        return (
          <ChartPreview $type="text">
            <TextLines>
              <div className="text-line" />
              <div className="text-line short" />
              <div className="text-line" />
              <div className="text-line medium" />
            </TextLines>
          </ChartPreview>
        );
      case 'sitemap':
        return (
          <ChartPreview $type="sitemap">
            <PreviewChart viewBox="0 0 100 60">
              {/* Central node */}
              <motion.circle 
                cx="50" cy="30" r="6" 
                fill={theme.colors.accent} 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
              />
              {/* Connected nodes */}
              <motion.circle cx="20" cy="15" r="3" fill={theme.colors.accent} opacity="0.7" />
              <motion.circle cx="80" cy="15" r="3" fill={theme.colors.accent} opacity="0.7" />
              <motion.circle cx="20" cy="45" r="3" fill={theme.colors.accent} opacity="0.7" />
              <motion.circle cx="80" cy="45" r="3" fill={theme.colors.accent} opacity="0.7" />
              {/* Connection lines */}
              <motion.path 
                d="M44,24 L26,18" 
                stroke={theme.colors.accent} 
                strokeWidth="1" 
                opacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <motion.path 
                d="M56,24 L74,18" 
                stroke={theme.colors.accent} 
                strokeWidth="1" 
                opacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.7 }}
              />
              <motion.path 
                d="M44,36 L26,42" 
                stroke={theme.colors.accent} 
                strokeWidth="1" 
                opacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.9 }}
              />
              <motion.path 
                d="M56,36 L74,42" 
                stroke={theme.colors.accent} 
                strokeWidth="1" 
                opacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1.1 }}
              />
            </PreviewChart>
          </ChartPreview>
        );
      default:
        return <ChartPreview $type="grid" />;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <HeroTitle variants={itemVariants}>
            DATA INTELLIGENCE<br />PORTFOLIO
          </HeroTitle>
          <HeroSubtitle variants={itemVariants}>
            Advanced analytics and visualization solutions built with precision and elegance
          </HeroSubtitle>
          <DitheredPattern size="lg" opacity={0.1} />
        </HeroContent>
      </HeroSection>

      {/* Portfolio Section */}
      <PortfolioSection>
        <SectionTitle variants={itemVariants}>
          FEATURED PROJECTS
        </SectionTitle>
        
        <ProjectGrid>
          <AnimatePresence>
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                custom={index}
              >
                <ProjectCard hover border gradient>
                  <ProjectThumbnail>
                    <ThumbnailContent>
                      {renderPreview(project)}
                      <PreviewTitle>
                        {project.type === 'landing' ? 'LANDING' :
                         project.type === 'charts' ? 'ANALYTICS' : 
                         project.type === 'text' ? 'NLP' : 'SITEMAP'}
                      </PreviewTitle>
                      <PreviewSubtitle>
                        {project.type === 'landing' ? 'Welcome Experience' :
                         project.type === 'charts' ? 'Line Chart Analysis' : 
                         project.type === 'text' ? 'Text Analysis' : 'Link Extraction'}
                      </PreviewSubtitle>
                    </ThumbnailContent>
                  </ProjectThumbnail>
                  
                  <ProjectInfo>
                    <ProjectTitle>{project.title}</ProjectTitle>
                    <ProjectDescription>{project.description}</ProjectDescription>
                    <ProjectLink to={project.link}>
                      VIEW PROJECT <span className="arrow">↗</span>
                    </ProjectLink>
                  </ProjectInfo>
                </ProjectCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </ProjectGrid>
      </PortfolioSection>

      {/* CTA Section */}
      <CTASection>
        <CTATitle variants={itemVariants}>
          EXPLORE INTELLIGENT DATA
        </CTATitle>
        <CTASubtitle variants={itemVariants}>
          Discover patterns, insights, and intelligence through advanced visualization
        </CTASubtitle>
        <motion.div variants={itemVariants}>
          <Button size="lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            GET STARTED
          </Button>
        </motion.div>
      </CTASection>
    </motion.div>
  );
};

export default Portfolio;