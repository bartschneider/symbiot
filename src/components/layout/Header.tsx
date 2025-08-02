import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';
import { NavItem } from '@/types';

const HeaderContainer = styled.header`
  padding: ${theme.spacing.lg} 0;
  border-bottom: 1px solid ${theme.colors.border};
  margin-bottom: ${theme.spacing.xxl};
  background: ${theme.colors.bg.secondary};
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.header};
  backdrop-filter: blur(10px);
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: ${theme.layout.containerMaxWidth};
  margin: 0 auto;
  padding: 0 ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    gap: ${theme.spacing.md};
    padding: 0 ${theme.spacing.sm};
  }
`;

const Brand = styled(Link)`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.1em;
  color: ${theme.colors.accent};
  text-decoration: none;
  position: relative;
  
  &:hover {
    color: ${theme.colors.accent};
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: center;

  @media (max-width: ${theme.breakpoints.md}) {
    gap: ${theme.spacing.md};
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const NavLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>`
  color: ${theme.colors.text.primary};
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.regular};
  letter-spacing: 0.05em;
  transition: color ${theme.animation.transition.fast};
  position: relative;
  padding: ${theme.spacing.xs} 0;

  color: ${props => props.isActive ? theme.colors.accent : theme.colors.text.primary};

  &:hover {
    color: ${theme.colors.accent};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: ${props => props.isActive ? '100%' : '0'};
    height: 2px;
    background-color: ${theme.colors.accent};
    transition: width ${theme.animation.transition.medium};
  }

  &:hover::after {
    width: 100%;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.lg};
  cursor: pointer;
  padding: ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.sm}) {
    display: block;
  }
`;

const MobileNav = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${theme.colors.bg.secondary};
  z-index: ${theme.zIndex.modal};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const MobileNavLink = styled(Link)`
  color: ${theme.colors.text.primary};
  text-decoration: none;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.regular};
  letter-spacing: 0.05em;
  padding: ${theme.spacing.md};

  &:hover {
    color: ${theme.colors.accent};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize['2xl']};
  cursor: pointer;
  padding: ${theme.spacing.xs};
`;

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'PORTFOLIO', href: '/' },
    { label: 'LANDING', href: '/landing' },
    { label: 'CHARTS', href: '/analysis' },
    { label: 'TEXT ANALYSIS', href: '/text-analysis' },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <HeaderContainer className={className}>
        <Nav>
          <Brand to="/" aria-label="Symbiot Home">
            Symbiot
          </Brand>
          
          <NavLinks>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                isActive={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </NavLink>
            ))}
            
            <MobileMenuButton
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              ☰
            </MobileMenuButton>
          </NavLinks>
        </Nav>
      </HeaderContainer>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileNav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CloseButton
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close mobile menu"
            >
              ×
            </CloseButton>
            
            {navItems.map((item) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <MobileNavLink to={item.href}>
                  {item.label}
                </MobileNavLink>
              </motion.div>
            ))}
          </MobileNav>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;