import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const WelcomeHero = styled.section`
  padding: ${theme.spacing.xxl} 0;
  text-align: center;
  position: relative;
  margin-bottom: ${theme.spacing.xxl};
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const HeroBadge = styled(motion.div)`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.accent}20, ${theme.colors.accent}10);
  border: 1px solid ${theme.colors.accent}40;
  border-radius: ${theme.layout.borderRadius.sm};
  color: ${theme.colors.accent};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.lg};
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.02em;
  line-height: 1.1;
  margin-bottom: ${theme.spacing.lg};
  text-transform: uppercase;
  color: ${theme.colors.text.primary};

  .accent-text {
    color: ${theme.colors.accent};
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xl};
  line-height: 1.6;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    gap: ${theme.spacing.sm};
  }
`;

const PlayIcon = styled.span`
  margin-left: ${theme.spacing.xs};
`;

const HeroVisual = styled.div`
  position: relative;
  height: 300px;
  margin-top: ${theme.spacing.xl};
`;

const DataSphere = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
`;

const SphereLayer = styled(motion.div)<{ $layer: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid ${theme.colors.accent};
  border-radius: 50%;
  opacity: ${({ $layer }) => 0.6 - $layer * 0.15};
  
  &.layer-1 {
    border-style: solid;
  }
  &.layer-2 {
    border-style: dashed;
    transform: scale(0.8);
  }
  &.layer-3 {
    border-style: dotted;
    transform: scale(0.6);
  }
`;

const DataPoint = styled(motion.div)<{ $delay: number }>`
  position: absolute;
  width: 6px;
  height: 6px;
  background: ${theme.colors.accent};
  border-radius: 50%;
  top: 50%;
  left: 50%;
`;

const FeaturesSection = styled.section`
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

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const FeatureCard = styled(Card)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const FeatureIcon = styled.div`
  width: 60px;
  height: 60px;
  margin: 0 auto ${theme.spacing.lg};
  color: ${theme.colors.accent};
  
  svg {
    width: 100%;
    height: 100%;
  }
`;

const FeatureTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
`;

const DemoSection = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xxl};
  align-items: center;
  margin-bottom: ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.xl};
    text-align: center;
  }
`;

const DemoText = styled.div``;

const DemoTitle = styled(motion.h2)`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
`;

const DemoDescription = styled(motion.p)`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing.xl};
  line-height: 1.6;
`;

const DemoStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.md};
  }
`;

const Stat = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.bg.primary};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
`;

const StatNumber = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DemoVisual = styled.div`
  position: relative;
  height: 300px;
`;

const ProcessingAnimation = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
`;

const DataStream = styled(motion.div)`
  width: 80%;
  height: 4px;
  background: linear-gradient(90deg, ${theme.colors.accent}00, ${theme.colors.accent}, ${theme.colors.accent}00);
  border-radius: 2px;
`;

const ProcessingNodes = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
`;

const Node = styled(motion.div)<{ $active?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? theme.colors.accent : theme.colors.border};
  border: 2px solid ${theme.colors.accent};
`;

const OutputGraph = styled.div`
  width: 80%;
  height: 80px;
  
  svg {
    width: 100%;
    height: 100%;
  }
`;

const ProjectsPreview = styled.section`
  margin-bottom: ${theme.spacing.xxl};
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const PreviewCard = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
  padding: ${theme.spacing.xl};
  background: ${theme.colors.bg.secondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.default};
  text-align: center;
  transition: all ${theme.animation.transition.medium};

  &:hover {
    transform: translateY(-4px);
    border-color: ${theme.colors.accent};
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
`;

const PreviewIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${theme.spacing.md};
`;

const PreviewTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
`;

const PreviewDescription = styled.p`
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.md};
`;

const PreviewArrow = styled.span`
  color: ${theme.colors.accent};
  font-size: ${theme.typography.fontSize.lg};
`;

const CTASection = styled.section`
  text-align: center;
  padding: ${theme.spacing.xxl} 0;
  border-top: 1px solid ${theme.colors.border};
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
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const Landing: React.FC = () => {
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Hero */}
      <WelcomeHero>
        <HeroContent>
          <HeroBadge variants={itemVariants}>
            WELCOME TO THE FUTURE
          </HeroBadge>
          
          <HeroTitle variants={itemVariants}>
            INTELLIGENT DATA<br />
            <span className="accent-text">VISUALIZATION</span>
          </HeroTitle>
          
          <HeroSubtitle variants={itemVariants}>
            Transform complex data into actionable insights through our advanced AI-powered 
            visualization platform. Experience the next generation of data intelligence.
          </HeroSubtitle>
          
          <HeroActions variants={itemVariants}>
            <Button size="lg">
              START EXPLORING
            </Button>
            <Button variant="secondary" size="lg">
              WATCH DEMO <PlayIcon>▶</PlayIcon>
            </Button>
          </HeroActions>
        </HeroContent>
        
        <HeroVisual>
          <DataSphere>
            <SphereLayer
              $layer={1}
              className="layer-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <SphereLayer
              $layer={2}
              className="layer-2"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
            <SphereLayer
              $layer={3}
              className="layer-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />
            
            {[0, 0.5, 1, 1.5, 2].map((delay, index) => (
              <DataPoint
                key={index}
                $delay={delay}
                animate={{
                  x: [0, 100, 0, -100, 0],
                  y: [0, -50, 0, 50, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </DataSphere>
        </HeroVisual>
      </WelcomeHero>

      {/* Features Section */}
      <FeaturesSection>
        <SectionTitle variants={itemVariants}>
          CORE CAPABILITIES
        </SectionTitle>
        
        <FeaturesGrid>
          <motion.div variants={itemVariants}>
            <FeatureCard>
              <FeatureIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 12l4-4 4 4 6-6" />
                </svg>
              </FeatureIcon>
              <FeatureTitle>REAL-TIME ANALYTICS</FeatureTitle>
              <FeatureDescription>
                Process and visualize streaming data with millisecond precision. 
                Advanced algorithms deliver insights as data flows.
              </FeatureDescription>
            </FeatureCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <FeatureCard>
              <FeatureIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M9 9h6v6H9z" />
                </svg>
              </FeatureIcon>
              <FeatureTitle>AI-POWERED INSIGHTS</FeatureTitle>
              <FeatureDescription>
                Machine learning algorithms automatically detect patterns, anomalies, 
                and trends in your data streams.
              </FeatureDescription>
            </FeatureCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <FeatureCard>
              <FeatureIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </FeatureIcon>
              <FeatureTitle>INTELLIGENT PROCESSING</FeatureTitle>
              <FeatureDescription>
                Natural language queries and automated report generation powered by 
                advanced AI understanding.
              </FeatureDescription>
            </FeatureCard>
          </motion.div>
        </FeaturesGrid>
      </FeaturesSection>

      {/* Demo Section */}
      <DemoSection>
        <DemoText>
          <DemoTitle variants={itemVariants}>
            SEE IT IN ACTION
          </DemoTitle>
          <DemoDescription variants={itemVariants}>
            Experience how our platform transforms raw data into meaningful visualizations. 
            Watch real-time processing in action.
          </DemoDescription>
          <DemoStats>
            <Stat variants={itemVariants}>
              <StatNumber>2.4M</StatNumber>
              <StatLabel>DATA POINTS/SEC</StatLabel>
            </Stat>
            <Stat variants={itemVariants}>
              <StatNumber>99.9%</StatNumber>
              <StatLabel>ACCURACY</StatLabel>
            </Stat>
            <Stat variants={itemVariants}>
              <StatNumber>&lt;50MS</StatNumber>
              <StatLabel>LATENCY</StatLabel>
            </Stat>
          </DemoStats>
        </DemoText>
        
        <DemoVisual>
          <ProcessingAnimation>
            <DataStream
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <ProcessingNodes>
              <Node
                $active
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <Node />
              <Node />
            </ProcessingNodes>
            <OutputGraph>
              <svg viewBox="0 0 200 100">
                <motion.path
                  d="M10,80 Q50,20 100,40 T190,30"
                  stroke={theme.colors.accent}
                  strokeWidth="3"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </svg>
            </OutputGraph>
          </ProcessingAnimation>
        </DemoVisual>
      </DemoSection>

      {/* Projects Preview */}
      <ProjectsPreview>
        <SectionTitle variants={itemVariants}>
          EXPLORE PROJECTS
        </SectionTitle>
        
        <PreviewGrid>
          <motion.div variants={itemVariants}>
            <PreviewCard to="/analysis">
              <PreviewIcon>📊</PreviewIcon>
              <PreviewTitle>CHART ANALYSIS</PreviewTitle>
              <PreviewDescription>Advanced line chart visualizations</PreviewDescription>
              <PreviewArrow>→</PreviewArrow>
            </PreviewCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <PreviewCard to="/text-analysis">
              <PreviewIcon>📝</PreviewIcon>
              <PreviewTitle>TEXT ANALYSIS</PreviewTitle>
              <PreviewDescription>Natural language processing</PreviewDescription>
              <PreviewArrow>→</PreviewArrow>
            </PreviewCard>
          </motion.div>
        </PreviewGrid>
      </ProjectsPreview>

      {/* CTA Section */}
      <CTASection>
        <CTATitle variants={itemVariants}>
          READY TO BEGIN?
        </CTATitle>
        <CTASubtitle variants={itemVariants}>
          Join the future of data intelligence and unlock insights you never knew existed
        </CTASubtitle>
        <motion.div variants={itemVariants}>
          <Button size="lg">
            GET STARTED NOW
          </Button>
        </motion.div>
      </CTASection>
    </motion.div>
  );
};

export default Landing;