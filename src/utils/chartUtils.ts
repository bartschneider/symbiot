import { ChartDataPoint } from '@/types';

/**
 * Generate sample data for demonstration purposes
 */
export const generateSampleData = (points: number = 20): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now.getTime() - (points - i) * 3600000); // Hourly data
    const baseValue = 50;
    const trend = i * 2; // Upward trend
    const noise = (Math.random() - 0.5) * 20; // Random variation
    const value = Math.max(0, baseValue + trend + noise);

    data.push({
      x: i,
      y: parseFloat(value.toFixed(2)),
      label: `Point ${i + 1}`,
      timestamp,
    });
  }

  return data;
};

/**
 * Generate realistic stock-like data
 */
export const generateStockData = (
  points: number = 30,
  initialPrice: number = 100
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let currentPrice = initialPrice;
  const now = new Date();

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now.getTime() - (points - i) * 86400000); // Daily data
    
    // Simulate realistic stock movement
    const volatility = 0.05; // 5% daily volatility
    const drift = 0.001; // Slight upward drift
    const change = (Math.random() - 0.5) * 2 * volatility + drift;
    currentPrice *= (1 + change);
    
    data.push({
      x: i,
      y: parseFloat(currentPrice.toFixed(2)),
      label: timestamp.toLocaleDateString(),
      timestamp,
    });
  }

  return data;
};

/**
 * Generate sine wave data for smooth demonstrations
 */
export const generateSinusoidalData = (
  points: number = 50,
  amplitude: number = 30,
  frequency: number = 1,
  offset: number = 50
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];

  for (let i = 0; i < points; i++) {
    const x = (i / points) * 4 * Math.PI * frequency;
    const y = amplitude * Math.sin(x) + offset;
    
    data.push({
      x: i,
      y: parseFloat(y.toFixed(2)),
      label: `T${i}`,
    });
  }

  return data;
};

/**
 * Generate performance metrics data
 */
export const generatePerformanceData = (): ChartDataPoint[] => {
  const metrics = [
    'Load Time',
    'First Paint',
    'DOM Ready',
    'Interactive',
    'Complete',
  ];

  return metrics.map((metric, index) => ({
    x: index,
    y: Math.random() * 5000 + 500, // 500-5500ms
    label: metric,
  }));
};

/**
 * Generate analytics data (page views, users, etc.)
 */
export const generateAnalyticsData = (days: number = 30): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const timestamp = new Date(now.getTime() - (days - i) * 86400000);
    const dayOfWeek = timestamp.getDay();
    
    // Higher traffic on weekdays
    const baseTraffic = dayOfWeek === 0 || dayOfWeek === 6 ? 1000 : 2000;
    const variation = Math.random() * 500;
    const traffic = Math.floor(baseTraffic + variation);

    data.push({
      x: i,
      y: traffic,
      label: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp,
    });
  }

  return data;
};

/**
 * Calculate moving average for smoothing data
 */
export const calculateMovingAverage = (
  data: ChartDataPoint[],
  window: number = 5
): ChartDataPoint[] => {
  if (data.length < window) return data;

  const result: ChartDataPoint[] = [];

  for (let i = window - 1; i < data.length; i++) {
    const slice = data.slice(i - window + 1, i + 1);
    const average = slice.reduce((sum, point) => sum + point.y, 0) / window;
    
    result.push({
      ...data[i],
      y: parseFloat(average.toFixed(2)),
      label: `${data[i].label} (MA${window})`,
    });
  }

  return result;
};

/**
 * Find peaks and valleys in data
 */
export const findExtremes = (data: ChartDataPoint[]) => {
  const peaks: ChartDataPoint[] = [];
  const valleys: ChartDataPoint[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const current = data[i];
    const next = data[i + 1];

    if (current.y > prev.y && current.y > next.y) {
      peaks.push(current);
    } else if (current.y < prev.y && current.y < next.y) {
      valleys.push(current);
    }
  }

  return { peaks, valleys };
};

/**
 * Calculate basic statistics for dataset
 */
export const calculateStatistics = (data: ChartDataPoint[]) => {
  if (data.length === 0) return null;

  const values = data.map(point => point.y);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
    : sortedValues[Math.floor(sortedValues.length / 2)];

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    count: data.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    standardDeviation: parseFloat(standardDeviation.toFixed(2)),
    variance: parseFloat(variance.toFixed(2)),
  };
};

/**
 * Format number for display in charts
 */
export const formatChartValue = (value: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(value);
  }
};

/**
 * Generate color gradient based on data values
 */
export const generateColorGradient = (
  data: ChartDataPoint[],
  startColor: string = '#68FFC9',
  endColor: string = '#FF6B6B'
): string[] => {
  if (data.length === 0) return [];

  const values = data.map(point => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return data.map(point => {
    if (range === 0) return startColor;
    
    const ratio = (point.y - min) / range;
    const r1 = parseInt(startColor.slice(1, 3), 16);
    const g1 = parseInt(startColor.slice(3, 5), 16);
    const b1 = parseInt(startColor.slice(5, 7), 16);
    
    const r2 = parseInt(endColor.slice(1, 3), 16);
    const g2 = parseInt(endColor.slice(3, 5), 16);
    const b2 = parseInt(endColor.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  });
};