import { Global } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

import Header from './Header';
import Footer from './Footer';
import { globalStyles, containerStyles } from '@/styles/globalStyles';

const LayoutContainer = styled.div`
  ${containerStyles}
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const PageContainer = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.4,
};

interface LayoutProps {
  className?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ className, children }) => {
  return (
    <>
      {/* Global styles */}
      <Global styles={globalStyles} />
      
      <LayoutContainer className={className}>
        <Header />
        
        <Main>
          <PageContainer
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            {children}
          </PageContainer>
        </Main>
        
        <Footer />
      </LayoutContainer>
    </>
  );
};

export default Layout;