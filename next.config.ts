import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@emotion/react', '@emotion/styled', 'framer-motion', 'lucide-react'],
  },
  compiler: {
    emotion: true, // Enable Emotion support in SWC compiler
  },
  transpilePackages: ['@emotion/react', '@emotion/styled'],
  output: 'standalone', // Enable standalone output for Docker
  // Note: Webpack configuration disabled when using Turbopack
  // The Emotion configuration is handled by the Next.js compiler.emotion setting above
  // Environment variables configuration
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Development server configuration
  ...(process.env.NODE_ENV === 'development' && {
    typescript: {
      ignoreBuildErrors: false,
    },
    eslint: {
      ignoreDuringBuilds: false,
    }
  }),
};

export default nextConfig;
