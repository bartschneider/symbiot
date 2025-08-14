import ErrorBoundary from './components/ui/ErrorBoundary';
import Layout from './components/layout/Layout';
import SitemapExtractor from './components/sitemap/SitemapExtractor';

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <SitemapExtractor />
      </Layout>
    </ErrorBoundary>
  );
}

export default App;