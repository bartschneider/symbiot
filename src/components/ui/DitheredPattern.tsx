import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';

const PatternContainer = styled(motion.div)<{
  $size: 'sm' | 'md' | 'lg';
  $opacity: number;
}>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '200px';
      case 'lg': return '400px';
      default: return '300px';
    }
  }};
  
  height: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '200px';
      case 'lg': return '400px';
      default: return '300px';
    }
  }};
  
  background-image: 
    radial-gradient(circle at 25% 25%, ${theme.colors.accent} 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, ${theme.colors.accent} 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  opacity: ${({ $opacity }) => $opacity};
  z-index: 1;
  pointer-events: none;

  @media (max-width: ${theme.breakpoints.md}) {
    width: ${({ $size }) => {
      switch ($size) {
        case 'sm': return '150px';
        case 'lg': return '250px';
        default: return '200px';
      }
    }};
    
    height: ${({ $size }) => {
      switch ($size) {
        case 'sm': return '150px';
        case 'lg': return '250px';
        default: return '200px';
      }
    }};
  }
`;

const GridPattern = styled(motion.div)<{
  $size: 'sm' | 'md' | 'lg';
  $opacity: number;
}>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '80px';
      case 'lg': return '120px';
      default: return '100px';
    }
  }};
  
  height: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '80px';
      case 'lg': return '120px';
      default: return '100px';
    }
  }};
  
  background-image: 
    linear-gradient(0deg, ${theme.colors.border} 1px, transparent 1px),
    linear-gradient(90deg, ${theme.colors.border} 1px, transparent 1px);
  background-size: 15px 15px;
  opacity: ${({ $opacity }) => $opacity};
  z-index: 1;
  pointer-events: none;
`;

interface DitheredPatternProps {
  variant?: 'dots' | 'grid';
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
  animate?: boolean;
  className?: string;
}

const DitheredPattern: React.FC<DitheredPatternProps> = ({
  variant = 'dots',
  size = 'md',
  opacity = 0.1,
  animate = true,
  className,
}) => {
  const animationVariants = {
    initial: {
      rotate: 0,
      scale: 1,
    },
    animate: {
      rotate: 180,
      scale: 1.1,
    },
  };

  const animationTransition = {
    duration: 8,
    repeat: Infinity,
    repeatType: 'reverse' as const,
    ease: 'easeInOut',
  };

  const staticProps = {
    className,
    $size: size,
    $opacity: opacity,
  };

  const motionProps = animate
    ? {
        initial: 'initial',
        animate: 'animate',
        variants: animationVariants,
        transition: animationTransition,
      }
    : {};

  if (variant === 'grid') {
    return (
      <GridPattern
        {...staticProps}
        {...motionProps}
      />
    );
  }

  return (
    <PatternContainer
      {...staticProps}
      {...motionProps}
    />
  );
};

export default DitheredPattern;