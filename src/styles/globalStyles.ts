import { css } from '@emotion/react';
import { theme } from './theme';

export const globalStyles = css`
  /* Reset & Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: ${theme.typography.fontFamily.primary};
    font-weight: ${theme.typography.fontWeight.regular};
    line-height: 1.6;
    color: ${theme.colors.text.primary};
    background-color: ${theme.colors.bg.primary};
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.bg.primary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.accent};
  }

  /* Selection */
  ::selection {
    background: ${theme.colors.accent};
    color: ${theme.colors.bg.primary};
  }

  /* Focus styles */
  :focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
  }

  /* Typography defaults */
  h1, h2, h3, h4, h5, h6 {
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: 1.2;
    margin: 0;
  }

  p {
    margin: 0;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
  }

  /* Utility classes for consistent spacing */
  .container {
    max-width: ${theme.layout.containerMaxWidth};
    margin: 0 auto;
    padding: 0 ${theme.spacing.md};
  }

  /* Animation utilities */
  .animate-in {
    animation: fadeIn ${theme.animation.duration.medium}ms ${theme.animation.easing.easeOut};
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive container */
  @media (max-width: ${theme.breakpoints.md}) {
    .container {
      padding: 0 ${theme.spacing.sm};
    }
  }

  /* Dithered pattern animation keyframes (from original CSS) */
  @keyframes dither-float {
    0%, 100% { 
      transform: translate(-50%, -50%) rotate(0deg) scale(1); 
    }
    50% { 
      transform: translate(-50%, -50%) rotate(180deg) scale(1.1); 
    }
  }

  /* Hide default focus outline for mouse users */
  .js-focus-visible :focus:not(.focus-visible) {
    outline: none;
  }
`;

export const containerStyles = css`
  min-height: 100vh;
  max-width: ${theme.layout.containerMaxWidth};
  margin: 0 auto;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.bg.secondary};
  border-radius: ${theme.layout.borderRadius.default};
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);

  @media (max-width: ${theme.breakpoints.md}) {
    margin: 0;
    padding: ${theme.spacing.sm};
    border-radius: 0;
  }
`;