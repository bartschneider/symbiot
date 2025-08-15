import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xl};
  min-height: 200px;
`;

const SpinnerBase = styled(motion.div)<{ $size: 'sm' | 'md' | 'lg' }>`
  width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '24px';
      case 'lg': return '64px';
      default: return '48px';
    }
  }};
  height: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '24px';
      case 'lg': return '64px';
      default: return '48px';
    }
  }};
  border: 3px solid ${theme.colors.border};
  border-top: 3px solid ${theme.colors.accent};
  border-radius: 50%;
`;

const DitheredSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  background-image: 
    radial-gradient(circle at 25% 25%, ${theme.colors.accent} 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, ${theme.colors.accent} 2px, transparent 2px);
  background-size: 12px 12px;
  background-position: 0 0, 6px 6px;
  border-radius: 50%;
  opacity: 0.8;
`;

const LoadingText = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.md};
  text-align: center;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dithered';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  text = 'Loading...',
  className,
}) => {
  const spinAnimation = {
    rotate: 360,
  };

  const spinTransition = {
    duration: 1,
    repeat: Infinity,
    ease: 'linear' as const,
  };

  const ditheredAnimation = {
    rotate: [0, 180, 360],
    scale: [1, 1.1, 1],
  };

  const ditheredTransition = {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  return (
    <SpinnerContainer className={className}>
      <div>
        {variant === 'dithered' ? (
          <DitheredSpinner
            animate={ditheredAnimation}
            transition={ditheredTransition}
          />
        ) : (
          <SpinnerBase
            $size={size}
            animate={spinAnimation}
            transition={spinTransition}
          />
        )}
        {text && <LoadingText>{text}</LoadingText>}
      </div>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;