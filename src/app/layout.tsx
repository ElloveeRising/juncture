import type { Metadata, Viewport } from 'next'
import './globals.css'
import { APP_NAME } from '@/lib/config'
import { SchellSeal } from '@/components/SchellSeal'

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — members only`,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b5998', // chrome blue tints the mobile browser bar
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
