import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/config'

// Installable web app — "Add to Home Screen" turns Juncture into an app icon
// on any phone, no app store, no gatekeeper. Same sovereignty, smaller glass.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — A Schell Company`,
    short_name: APP_NAME,
    description: 'The private social network of A Schell Company.',
    start_url: '/feed',
    display: 'standalone',
    background_color: '#f7f3ea',
    theme_color: '#1f8a7d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
