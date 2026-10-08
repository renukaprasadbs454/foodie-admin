import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import type { NextConfig } from 'next';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};


export default nextConfig;
