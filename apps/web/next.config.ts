import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les paquets internes exportent du TypeScript source : Next les transpile.
  transpilePackages: ['@edubrain/core'],
};

export default nextConfig;
