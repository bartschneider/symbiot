import { Link } from 'react-router-dom';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

const FooterContainer = styled.footer`
  border-top: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.lg} 0;
  margin-top: auto;
`;

const FooterContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  max-width: ${theme.layout.containerMaxWidth};
  margin: 0 auto;
  padding: 0 ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    gap: ${theme.spacing.md};
    text-align: center;
    padding: 0 ${theme.spacing.sm};
  }
`;

const FooterLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const FooterLink = styled(Link)`
  color: ${theme.colors.text.secondary};
  text-decoration: none;
  transition: color ${theme.animation.transition.fast};
  padding: ${theme.spacing.xs};

  &:hover {
    color: ${theme.colors.accent};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const ExternalLink = styled.a`
  color: ${theme.colors.text.secondary};
  text-decoration: none;
  transition: color ${theme.animation.transition.fast};
  padding: ${theme.spacing.xs};

  &:hover {
    color: ${theme.colors.accent};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const Copyright = styled.p`
  margin: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    order: 2;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const SocialIcon = styled.a`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.lg};
  transition: color ${theme.animation.transition.fast};
  padding: ${theme.spacing.xs};
  border-radius: 4px;

  &:hover {
    color: ${theme.colors.accent};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent};
    outline-offset: 2px;
  }
`;

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer className={className}>
      <FooterContent>
        <Copyright>
          © {currentYear} SYNTHORA. Advanced Data Intelligence.
        </Copyright>
        
        <FooterLinks>
          <FooterLink to="/privacy" aria-label="Privacy Policy">
            PRIVACY
          </FooterLink>
          <FooterLink to="/terms" aria-label="Terms of Service">
            TERMS
          </FooterLink>
          <FooterLink to="/" aria-label="Portfolio">
            PORTFOLIO
          </FooterLink>
          
          <SocialLinks>
            <SocialIcon
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub"
            >
              ⚡
            </SocialIcon>
            <SocialIcon
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              title="Twitter"
            >
              📊
            </SocialIcon>
            <SocialIcon
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              🔬
            </SocialIcon>
          </SocialLinks>
        </FooterLinks>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;