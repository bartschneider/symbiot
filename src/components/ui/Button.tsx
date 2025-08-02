import { forwardRef } from 'react';
import styled from '@emotion/styled';
import { motion, HTMLMotionProps } from 'framer-motion';
import { theme } from '@/styles/theme';
import { ButtonProps } from '@/types';

const ButtonBase = styled(motion.button)<{
  $variant: ButtonProps['variant'];
  $size: ButtonProps['size'];
  $disabled: boolean;
  $loading: boolean;
}>`
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  border: none;
  border-radius: ${theme.layout.borderRadius.sm};
  font-family: ${theme.typography.fontFamily.primary};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all ${theme.animation.transition.fast};
  position: relative;
  overflow: hidden;
  white-space: nowrap;

  /* Size variants */
  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return `
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          font-size: ${theme.typography.fontSize.sm};
        `;
      case 'lg':
        return `
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.lg};
        `;
      default: // 'md'
        return `
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.base};
        `;
    }
  }}

  /* Color variants */
  ${({ $variant }) => {
    switch ($variant) {
      case 'secondary':
        return `
          background: transparent;
          color: ${theme.colors.accent};
          border: 2px solid ${theme.colors.accent};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.accent};
            color: ${theme.colors.bg.primary};
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(104, 255, 201, 0.3);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.hover};
            border-color: ${theme.colors.accent};
            color: ${theme.colors.accent};
          }
        `;
      default: // 'primary'
        return `
          background: ${theme.colors.accent};
          color: ${theme.colors.bg.primary};
          border: 2px solid ${theme.colors.accent};
          
          &:hover:not(:disabled) {
            background: #5ae6b8;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(104, 255, 201, 0.3);
            
            .arrow {
              transform: translate(2px, -2px);
            }
          }
        `;
    }
  }}

  /* States */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Loading state */
  ${({ $loading }) => $loading && `
    cursor: wait;
    opacity: 0.8;
  `}
`;

const LoadingSpinner = styled(motion.div)`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
`;

const Arrow = styled.span`
  font-size: 1.2em;
  transition: transform ${theme.animation.transition.fast};
`;

interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, keyof ButtonProps>, ButtonProps {}

const Button = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      children,
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      onClick?.(event);
    };

    return (
      <ButtonBase
        ref={ref}
        $variant={variant}
        $size={size}
        $disabled={disabled}
        $loading={loading}
        disabled={disabled || loading}
        onClick={handleClick}
        type={type}
        className={className}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        {...props}
      >
        {loading && (
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
        {children}
        {!loading && variant === 'primary' && (
          <Arrow className="arrow">↗</Arrow>
        )}
      </ButtonBase>
    );
  }
);

Button.displayName = 'Button';

export default Button;