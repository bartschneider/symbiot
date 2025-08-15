'use client';
import { forwardRef } from 'react';
import styled from '@emotion/styled';
import { motion, HTMLMotionProps } from 'framer-motion';
import { theme } from '@/styles/theme';
import { CardProps } from '@/types';

const CardBase = styled(motion.div)<{
  $hover: boolean;
  $gradient: boolean;
  $border: boolean;
}>`
  background: ${({ $gradient }) =>
    $gradient
      ? `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)`
      : theme.colors.bg.secondary};
  
  border: 1px solid ${({ $border }) => $border ? theme.colors.border : 'transparent'};
  border-radius: ${theme.layout.borderRadius.default};
  padding: ${theme.spacing.lg};
  transition: all ${theme.animation.transition.medium};
  position: relative;
  overflow: hidden;

  ${({ $hover }) => $hover && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      border-color: ${theme.colors.accent};
    }
  `}

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
  }

  /* Subtle background pattern */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 25% 25%, ${theme.colors.accent}15 1px, transparent 1px),
      radial-gradient(circle at 75% 75%, ${theme.colors.accent}15 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    opacity: 0.1;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const CardHeader = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const CardTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  margin-bottom: ${theme.spacing.xs};
  text-transform: uppercase;
  color: ${theme.colors.text.primary};
`;

const CardDescription = styled.p`
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
  margin: 0;
`;

const CardBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const CardFooter = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

// Animation variants
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
  hover: {
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const,
    },
  },
};

interface MotionCardProps extends Omit<HTMLMotionProps<'div'>, keyof CardProps>, CardProps {}

// Define compound component types
type CardComponent = React.ForwardRefExoticComponent<MotionCardProps & React.RefAttributes<HTMLDivElement>> & {
  Content: typeof CardContent;
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

const Card = forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      hover = false,
      gradient = true,
      border = true,
      children,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const isInteractive = hover || onClick;

    return (
      <CardBase
        ref={ref}
        $hover={hover}
        $gradient={gradient}
        $border={border}
        className={className}
        onClick={onClick}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={isInteractive ? "hover" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        role={onClick ? "button" : undefined}
        {...props}
      >
        {children}
      </CardBase>
    );
  }
);

Card.displayName = 'Card';

// Compound components - properly typed
const CardWithCompounds = Card as CardComponent;
CardWithCompounds.Content = CardContent;
CardWithCompounds.Header = CardHeader;
CardWithCompounds.Title = CardTitle;
CardWithCompounds.Description = CardDescription;
CardWithCompounds.Body = CardBody;
CardWithCompounds.Footer = CardFooter;

export default CardWithCompounds;