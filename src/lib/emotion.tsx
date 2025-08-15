'use client';

import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { ReactNode, useState } from 'react';

export interface EmotionCacheProviderProps {
  children: ReactNode;
}

// Create emotion cache for client-side
export function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}

// Emotion cache provider for Next.js App Router
export function EmotionCacheProvider({ children }: EmotionCacheProviderProps) {
  const [cache] = useState(() => createEmotionCache());

  useServerInsertedHTML(() => {
    return (
      <style
        data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: Object.values(cache.inserted).join(' '),
        }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}