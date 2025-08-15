'use client';

import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Layout from '@/components/layout/Layout';
import SitemapExtractor from '@/components/sitemap/SitemapExtractor';

export default function Home() {
  return (
    <ErrorBoundary>
      <Layout>
        <SitemapExtractor />
      </Layout>
    </ErrorBoundary>
  );
}
