import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
};

export default nextConfig;
