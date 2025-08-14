export const theme = {
  colors: {
    // Core palette from existing design system
    bg: {
      primary: '#101214',
      secondary: '#1a1d20',
    },
    accent: '#68FFC9',
    text: {
      primary: '#ffffff',
      secondary: '#a8b2b8',
    },
    border: '#2a2d30',
    hover: 'rgba(104, 255, 201, 0.1)',
    
    // Extended palette for React components
    success: '#68FFC9',
    warning: '#FFB800',
    error: '#FF6B6B',
    info: '#4ECDC4',
  },
  
  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    fontWeight: {
      light: 300,
      regular: 400,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '4rem',    // 64px
    },
  },
  
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '3rem',     // 48px
    xxl: '4rem',    // 64px
  },
  
  layout: {
    containerMaxWidth: '1200px',
    borderRadius: {
      sm: '8px',
      default: '12px',
      lg: '16px',
    },
  },
  
  animation: {
    transition: {
      fast: '0.2s ease',
      medium: '0.3s ease',
      slow: '0.5s ease',
    },
    duration: {
      fast: 200,
      medium: 300,
      slow: 500,
    },
    easing: {
      easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  zIndex: {
    modal: 1000,
    dropdown: 100,
    header: 50,
    overlay: 40,
    tooltip: 30,
  },
} as const;

export type Theme = typeof theme;

// Type helpers for theme values
export type ThemeColor = keyof typeof theme.colors;
export type ThemeSpacing = keyof typeof theme.spacing;
export type ThemeFontSize = keyof typeof theme.typography.fontSize;
export type ThemeBreakpoint = keyof typeof theme.breakpoints;