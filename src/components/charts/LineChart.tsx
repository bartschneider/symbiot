import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { theme } from '@/styles/theme';
import { ChartDataPoint, ChartConfig } from '@/types';

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 400px;
  background: ${theme.colors.bg.primary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.default};
  padding: ${theme.spacing.lg};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 20%, ${theme.colors.accent}08 2px, transparent 2px),
      radial-gradient(circle at 80% 80%, ${theme.colors.accent}08 2px, transparent 2px);
    background-size: 30px 30px;
    background-position: 0 0, 15px 15px;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

const ChartTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ChartControls = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const ChartButton = styled.button<{ $active?: boolean }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${({ $active }) => $active ? theme.colors.accent : 'transparent'};
  color: ${({ $active }) => $active ? theme.colors.bg.primary : theme.colors.text.secondary};
  border: 1px solid ${({ $active }) => $active ? theme.colors.accent : theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.regular};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all ${theme.animation.transition.fast};

  &:hover {
    background: ${({ $active }) => $active ? theme.colors.accent : theme.colors.hover};
    border-color: ${theme.colors.accent};
    color: ${({ $active }) => $active ? theme.colors.bg.primary : theme.colors.accent};
  }
`;

const ChartContent = styled.div`
  height: calc(100% - 80px);
  width: 100%;
`;

const StyledTooltip = styled.div`
  background: ${theme.colors.bg.secondary};
  border: 1px solid ${theme.colors.accent};
  border-radius: ${theme.layout.borderRadius.sm};
  padding: ${theme.spacing.sm};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const TooltipLabel = styled.p`
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.typography.fontSize.sm};
`;

const TooltipValue = styled.p`
  color: ${theme.colors.accent};
  font-size: ${theme.typography.fontSize.sm};
  margin: 0;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${theme.colors.bg.primary}90;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid ${theme.colors.border};
  border-top: 3px solid ${theme.colors.accent};
  border-radius: 50%;
`;

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  type?: 'line' | 'area';
  animate?: boolean;
  loading?: boolean;
  className?: string;
  onDataPointClick?: (point: ChartDataPoint, index: number) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <StyledTooltip>
        <TooltipLabel>{`Time: ${label}`}</TooltipLabel>
        <TooltipValue>{`Value: ${payload[0].value.toFixed(2)}`}</TooltipValue>
      </StyledTooltip>
    );
  }
  return null;
};

const LineChart: React.FC<LineChartProps> = ({
  data,
  title = 'Data Visualization',
  type = 'line',
  animate = true,
  loading = false,
  className,
  onDataPointClick,
}) => {
  const [chartType, setChartType] = useState<'line' | 'area'>(type);
  const [animationComplete, setAnimationComplete] = useState(!animate);

  // Transform data for Recharts
  const chartData = data.map((point, index) => ({
    name: point.label || `Point ${index + 1}`,
    value: point.y,
    x: point.x,
    timestamp: point.timestamp,
  }));

  const handleDataPointClick = (data: any, index: number) => {
    if (onDataPointClick) {
      const originalPoint = {
        x: data.x,
        y: data.value,
        label: data.name,
        timestamp: data.timestamp,
      };
      onDataPointClick(originalPoint, index);
    }
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const ChartComponent = chartType === 'area' ? AreaChart : RechartsLineChart;

  return (
    <ChartContainer
      className={className}
      variants={chartVariants}
      initial={animate ? 'hidden' : 'visible'}
      animate="visible"
      onAnimationComplete={() => setAnimationComplete(true)}
    >
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

      <ChartHeader>
        <ChartTitle>{title}</ChartTitle>
        <ChartControls>
          <ChartButton
            $active={chartType === 'line'}
            onClick={() => setChartType('line')}
          >
            Line
          </ChartButton>
          <ChartButton
            $active={chartType === 'area'}
            onClick={() => setChartType('area')}
          >
            Area
          </ChartButton>
        </ChartControls>
      </ChartHeader>

      <ChartContent>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.colors.border}
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              stroke={theme.colors.text.secondary}
              fontSize={12}
              tick={{ fill: theme.colors.text.secondary }}
            />
            <YAxis
              stroke={theme.colors.text.secondary}
              fontSize={12}
              tick={{ fill: theme.colors.text.secondary }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="value"
                stroke={theme.colors.accent}
                fill={`${theme.colors.accent}30`}
                strokeWidth={3}
                dot={{
                  fill: theme.colors.accent,
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  stroke: theme.colors.accent,
                  strokeWidth: 2,
                  fill: theme.colors.bg.secondary,
                }}
                animationDuration={animate ? 1500 : 0}
                animationBegin={0}
                isAnimationActive={animationComplete}
                onClick={handleDataPointClick}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.colors.accent}
                strokeWidth={3}
                dot={{
                  fill: theme.colors.accent,
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  stroke: theme.colors.accent,
                  strokeWidth: 2,
                  fill: theme.colors.bg.secondary,
                }}
                animationDuration={animate ? 1500 : 0}
                animationBegin={0}
                isAnimationActive={animationComplete}
                onClick={handleDataPointClick}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </ChartContent>
    </ChartContainer>
  );
};

export default LineChart;