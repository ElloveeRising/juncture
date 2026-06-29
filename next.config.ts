import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude native modules from server-side bundling
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  experimental: {
    serverActions: {
      // Allow image/audio uploads through server actions (default is 1mb).
      bodySizeLimit: '40mb',
    },
  },
}

export default nextConfig
