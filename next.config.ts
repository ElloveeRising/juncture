import type { NextConfig } from 'next'

// Behind a reverse proxy / Cloudflare Tunnel, the browser's Origin is the public
// HTTPS domain while the app sees a localhost Host. Next.js server actions reject
// that mismatch unless the public origin is allow-listed here. We derive it from
// BASE_URL, plus any extra hosts in ALLOWED_ORIGINS (comma-separated).
const allowedOrigins: string[] = []
if (process.env.BASE_URL) {
  try {
    allowedOrigins.push(new URL(process.env.BASE_URL).host)
  } catch {
    // ignore a malformed BASE_URL
  }
}
if (process.env.ALLOWED_ORIGINS) {
  for (const o of process.env.ALLOWED_ORIGINS.split(',')) {
    const t = o.trim()
    if (t) allowedOrigins.push(t)
  }
}

const nextConfig: NextConfig = {
  // Exclude native modules from server-side bundling
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  experimental: {
    serverActions: {
      // Allow image/audio uploads through server actions (default is 1mb).
      bodySizeLimit: '40mb',
      ...(allowedOrigins.length ? { allowedOrigins } : {}),
    },
  },
}

export default nextConfig
