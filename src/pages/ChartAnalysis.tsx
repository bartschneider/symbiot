import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/styles/theme';
import { ChartDataPoint } from '@/types';
import LineChart from '@/components/charts/LineChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  generateSampleData,
  generateStockData,
  generateSinusoidalData,
  generateAnalyticsData,
  calculateStatistics,
  calculateMovingAverage,
  findExtremes,
} from '@/utils/chartUtils';

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
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ControlsSection = styled.section`
  margin-bottom: ${theme.spacing.xl};
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const ControlCard = styled(Card)`
  padding: ${theme.spacing.lg};
`;

const ControlTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DataButton = styled(Button)<{ $active?: boolean }>`
  background: ${({ $active }) => $active ? theme.colors.accent : 'transparent'};
  color: ${({ $active }) => $active ? theme.colors.bg.primary : theme.colors.text.secondary};
  border-color: ${({ $active }) => $active ? theme.colors.accent : theme.colors.border};
  font-size: ${theme.typography.fontSize.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};

  &:hover {
    background: ${({ $active }) => $active ? theme.colors.accent : theme.colors.hover};
    border-color: ${theme.colors.accent};
    color: ${({ $active }) => $active ? theme.colors.bg.primary : theme.colors.accent};
  }
`;

const ChartSection = styled.section`
  margin-bottom: ${theme.spacing.xxl};
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const StatsCard = styled(Card)`
  padding: ${theme.spacing.lg};
  height: fit-content;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.bg.primary};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize.xl};
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

const AnalysisSection = styled.div`
  border-top: 1px solid ${theme.colors.border};
  padding-top: ${theme.spacing.lg};
`;

const AnalysisTitle = styled.h4`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const AnalysisItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border}20;
  
  &:last-child {
    border-bottom: none;
  }
`;

const AnalysisLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const AnalysisValue = styled.span`
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.bold};
  font-size: ${theme.typography.fontSize.sm};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid ${theme.colors.border};
  border-top: 3px solid ${theme.colors.accent};
  border-radius: 50%;
`;

type DatasetType = 'sample' | 'stock' | 'sinusoidal' | 'analytics';

const ChartAnalysis: React.FC = () => {
  const [currentDataset, setCurrentDataset] = useState<DatasetType>('sample');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);

  // Generate initial data
  useEffect(() => {
    generateNewData(currentDataset);
  }, [currentDataset]);

  const generateNewData = async (type: DatasetType) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let newData: ChartDataPoint[] = [];
    
    switch (type) {
      case 'stock':
        newData = generateStockData(30, 100);
        break;
      case 'sinusoidal':
        newData = generateSinusoidalData(50, 30, 1, 50);
        break;
      case 'analytics':
        newData = generateAnalyticsData(30);
        break;
      default:
        newData = generateSampleData(20);
    }
    
    setChartData(newData);
    setSelectedPoint(null);
    setLoading(false);
  };

  const handleDataPointClick = (point: ChartDataPoint, index: number) => {
    setSelectedPoint(point);
  };

  const statistics = calculateStatistics(chartData);
  const movingAverage = chartData.length > 5 ? calculateMovingAverage(chartData, 5) : [];
  const extremes = findExtremes(chartData);

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

  const getDatasetTitle = (type: DatasetType): string => {
    switch (type) {
      case 'stock': return 'Stock Price Data';
      case 'sinusoidal': return 'Sinusoidal Wave Data';
      case 'analytics': return 'Website Analytics Data';
      default: return 'Sample Data';
    }
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
            CHART ANALYSIS
          </PageTitle>
          <PageSubtitle variants={itemVariants}>
            Advanced line chart visualizations with real-time data processing and statistical analysis
          </PageSubtitle>
        </PageHeader>

        {/* Controls Section */}
        <ControlsSection>
          <motion.div variants={itemVariants}>
            <ControlsGrid>
              <ControlCard>
                <ControlTitle>Dataset Type</ControlTitle>
                <ButtonGroup>
                  <DataButton
                    variant="ghost"
                    size="sm"
                    $active={currentDataset === 'sample'}
                    onClick={() => setCurrentDataset('sample')}
                  >
                    Sample
                  </DataButton>
                  <DataButton
                    variant="ghost"
                    size="sm"
                    $active={currentDataset === 'stock'}
                    onClick={() => setCurrentDataset('stock')}
                  >
                    Stock
                  </DataButton>
                  <DataButton
                    variant="ghost"
                    size="sm"
                    $active={currentDataset === 'sinusoidal'}
                    onClick={() => setCurrentDataset('sinusoidal')}
                  >
                    Wave
                  </DataButton>
                  <DataButton
                    variant="ghost"
                    size="sm"
                    $active={currentDataset === 'analytics'}
                    onClick={() => setCurrentDataset('analytics')}
                  >
                    Analytics
                  </DataButton>
                </ButtonGroup>
              </ControlCard>

              <ControlCard>
                <ControlTitle>Actions</ControlTitle>
                <ButtonGroup>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => generateNewData(currentDataset)}
                    disabled={loading}
                  >
                    Refresh Data
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPoint(null)}
                  >
                    Clear Selection
                  </Button>
                </ButtonGroup>
              </ControlCard>
            </ControlsGrid>
          </motion.div>
        </ControlsSection>

        {/* Chart Section */}
        <ChartSection>
          <ChartGrid>
            <motion.div variants={itemVariants}>
              {loading ? (
                <LoadingContainer>
                  <LoadingSpinner
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </LoadingContainer>
              ) : (
                <LineChart
                  data={chartData}
                  title={getDatasetTitle(currentDataset)}
                  animate
                  onDataPointClick={handleDataPointClick}
                />
              )}
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatsCard>
                <Card.Header>
                  <Card.Title>Statistics</Card.Title>
                </Card.Header>

                {statistics && (
                  <StatsGrid>
                    <StatItem>
                      <StatValue>{statistics.count}</StatValue>
                      <StatLabel>Points</StatLabel>
                    </StatItem>
                    <StatItem>
                      <StatValue>{statistics.mean}</StatValue>
                      <StatLabel>Mean</StatLabel>
                    </StatItem>
                    <StatItem>
                      <StatValue>{statistics.min}</StatValue>
                      <StatLabel>Min</StatLabel>
                    </StatItem>
                    <StatItem>
                      <StatValue>{statistics.max}</StatValue>
                      <StatLabel>Max</StatLabel>
                    </StatItem>
                  </StatsGrid>
                )}

                {selectedPoint && (
                  <AnalysisSection>
                    <AnalysisTitle>Selected Point</AnalysisTitle>
                    <AnalysisItem>
                      <AnalysisLabel>Label:</AnalysisLabel>
                      <AnalysisValue>{selectedPoint.label}</AnalysisValue>
                    </AnalysisItem>
                    <AnalysisItem>
                      <AnalysisLabel>Value:</AnalysisLabel>
                      <AnalysisValue>{selectedPoint.y}</AnalysisValue>
                    </AnalysisItem>
                    <AnalysisItem>
                      <AnalysisLabel>X Position:</AnalysisLabel>
                      <AnalysisValue>{selectedPoint.x}</AnalysisValue>
                    </AnalysisItem>
                    {selectedPoint.timestamp && (
                      <AnalysisItem>
                        <AnalysisLabel>Timestamp:</AnalysisLabel>
                        <AnalysisValue>
                          {selectedPoint.timestamp.toLocaleDateString()}
                        </AnalysisValue>
                      </AnalysisItem>
                    )}
                  </AnalysisSection>
                )}

                {extremes.peaks.length > 0 && (
                  <AnalysisSection>
                    <AnalysisTitle>Analysis</AnalysisTitle>
                    <AnalysisItem>
                      <AnalysisLabel>Peaks:</AnalysisLabel>
                      <AnalysisValue>{extremes.peaks.length}</AnalysisValue>
                    </AnalysisItem>
                    <AnalysisItem>
                      <AnalysisLabel>Valleys:</AnalysisLabel>
                      <AnalysisValue>{extremes.valleys.length}</AnalysisValue>
                    </AnalysisItem>
                    {statistics && (
                      <>
                        <AnalysisItem>
                          <AnalysisLabel>Std Dev:</AnalysisLabel>
                          <AnalysisValue>{statistics.standardDeviation}</AnalysisValue>
                        </AnalysisItem>
                        <AnalysisItem>
                          <AnalysisLabel>Median:</AnalysisLabel>
                          <AnalysisValue>{statistics.median}</AnalysisValue>
                        </AnalysisItem>
                      </>
                    )}
                  </AnalysisSection>
                )}
              </StatsCard>
            </motion.div>
          </ChartGrid>
        </ChartSection>
      </motion.div>
    </PageContainer>
  );
};

export default ChartAnalysis;