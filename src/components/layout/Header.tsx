import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

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

const Brand = styled.h1`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.1em;
  color: ${theme.colors.accent};
  margin: 0;
  position: relative;
`;

const SubTitle = styled.p`
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.text.secondary};
  margin: 0;
  letter-spacing: 0.05em;
`;






interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <HeaderContainer className={className}>
      <Nav>
        <div>
          <Brand>Synthora</Brand>
          <SubTitle>Web Content Extraction Platform</SubTitle>
        </div>
      </Nav>
    </HeaderContainer>
  );
};

export default Header;