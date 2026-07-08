import type { Metadata, Viewport } from 'next'
import './globals.css'
import { APP_NAME } from '@/lib/config'
import { SchellSeal } from '@/components/SchellSeal'

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — members only`,
  // iPhone "Add to Home Screen" — full-screen app feel, vinyl icon
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f8a7d', // chrome blue tints the mobile browser bar
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SchellSeal />
      </body>
    </html>
  )
}
