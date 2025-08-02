// Navigation types
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// Project types
export interface Project {
  id: string;
  title: string;
  description: string;
  link: string;
  type: 'landing' | 'charts' | 'text' | 'sitemap' | 'other';
  preview?: {
    type: 'grid' | 'chart' | 'text' | 'sitemap';
    data?: any;
  };
}

// Chart data types
export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
  timestamp?: Date;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'scatter';
  data: ChartDataPoint[];
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    animation?: boolean;
    legend?: boolean;
    grid?: boolean;
    tooltip?: boolean;
  };
}

// Text analysis types
export interface TextAnalysisResult {
  text: string;
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0 to 1
  };
  keywords: Array<{
    word: string;
    frequency: number;
    relevance: number;
  }>;
  entities?: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'other';
    confidence: number;
  }>;
  readability?: {
    score: number;
    level: string;
  };
}

// Animation types
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  direction?: 'normal' | 'reverse' | 'alternate';
}

// Theme context types
export interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps extends BaseComponentProps {
  hover?: boolean;
  gradient?: boolean;
  border?: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Chart library specific types
export interface RechartsDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartJsDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
}

// Route types for React Router
export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  children?: RouteConfig[];
}

// Performance metrics types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

// Error boundary types
export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventId?: string;
}

// Local storage types
export interface LocalStorageData {
  theme: 'light' | 'dark';
  userPreferences: {
    animationsEnabled: boolean;
    reducedMotion: boolean;
  };
  analyticsData?: {
    visitCount: number;
    lastVisit: string;
  };
}