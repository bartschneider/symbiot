import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout component
import Layout from '@/components/layout/Layout';

// Loading component
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load page components for code splitting
const Portfolio = lazy(() => import('@/pages/Portfolio'));
const Landing = lazy(() => import('@/pages/Landing'));
const ChartAnalysis = lazy(() => import('@/pages/ChartAnalysis'));
const TextAnalysis = lazy(() => import('@/pages/TextAnalysis'));
const SitemapAnalysis = lazy(() => import('@/pages/SitemapAnalysis'));

// Error boundary component
const ErrorBoundary = lazy(() => import('@/components/ui/ErrorBoundary'));

// Wrapper for lazy-loaded components with suspense
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

// Route configuration
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: (
      <SuspenseWrapper>
        <ErrorBoundary />
      </SuspenseWrapper>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Portfolio />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'landing',
        element: (
          <SuspenseWrapper>
            <Landing />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'analysis',
        element: (
          <SuspenseWrapper>
            <ChartAnalysis />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'text-analysis',
        element: (
          <SuspenseWrapper>
            <TextAnalysis />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'sitemap-analysis',
        element: (
          <SuspenseWrapper>
            <SitemapAnalysis />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  // 404 fallback route
  {
    path: '*',
    element: (
      <SuspenseWrapper>
        <div>404 - Page Not Found</div>
      </SuspenseWrapper>
    ),
  },
];

// Create router instance
export const router = createBrowserRouter(routes, {
  future: {
    // Enable future flags for better performance
    v7_normalizeFormMethod: true,
    // Note: v7_startTransition is not available in React Router v6.20.1
    // It will be available in v7.x when upgrading
  },
});

export default router;