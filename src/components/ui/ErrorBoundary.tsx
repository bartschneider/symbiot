'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';
import Button from './Button';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${theme.spacing.xl};
  text-align: center;
  background: ${theme.colors.bg.secondary};
  border-radius: ${theme.layout.borderRadius.default};
  border: 1px solid ${theme.colors.border};
  margin: ${theme.spacing.lg};
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${theme.spacing.lg};
  color: ${theme.colors.error};
`;

const ErrorTitle = styled.h2`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.md};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ErrorMessage = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing.xl};
  max-width: 600px;
  line-height: 1.6;
`;

const ErrorDetails = styled.details`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background: ${theme.colors.bg.primary};
  border-radius: ${theme.layout.borderRadius.sm};
  border: 1px solid ${theme.colors.border};
  max-width: 800px;
  width: 100%;
`;

const ErrorSummary = styled.summary`
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  
  &:hover {
    color: ${theme.colors.accent};
  }
`;

const ErrorStack = styled.pre`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  overflow-x: auto;
  white-space: pre-wrap;
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.bg.secondary};
  border-radius: ${theme.layout.borderRadius.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    width: 100%;
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // In production, you might want to log to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>Something Went Wrong</ErrorTitle>
          <ErrorMessage>
            We encountered an unexpected error. Our team has been notified and is working to fix the issue.
            You can try refreshing the page or returning to the homepage.
          </ErrorMessage>
          
          <ButtonGroup>
            <Button variant="primary" onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={this.handleReload}>
              Reload Page
            </Button>
            <Button variant="ghost" onClick={this.handleGoHome}>
              Go Home
            </Button>
          </ButtonGroup>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              <ErrorSummary>Error Details (Development)</ErrorSummary>
              <div>
                <strong>Error:</strong> {this.state.error.message}
                {this.state.errorInfo && (
                  <ErrorStack>
                    {this.state.error.stack}
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </ErrorStack>
                )}
              </div>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;