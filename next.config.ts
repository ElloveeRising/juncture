import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude native modules from server-side bundling
  serverExternalPackages: ['better-sqlite3', 'sharp'],
}

export default nextConfig
