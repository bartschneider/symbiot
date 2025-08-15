import type { Metadata } from 'next';
import { EmotionCacheProvider } from '@/lib/emotion';

export const metadata: Metadata = {
  title: 'Knowledge Graph Platform',
  description: 'Web scraping and content extraction platform with knowledge graph capabilities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <EmotionCacheProvider>
          {children}
        </EmotionCacheProvider>
      </body>
    </html>
  );
}
