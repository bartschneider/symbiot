// Component base types

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

// Sitemap types for Phase 1 compatibility
export interface SitemapRequest {
  url: string;
  options?: {
    maxDepth?: number;
    includeSubdomains?: boolean;
    excludePatterns?: string[];
  };
}

export interface SitemapResponse {
  success: boolean;
  data?: {
    urls: string[];
    metadata: {
      totalUrls: number;
      processingTime: number;
      timestamp: string;
    };
  };
  error?: string;
}