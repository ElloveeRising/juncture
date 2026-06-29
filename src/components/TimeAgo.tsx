'use client'

import { useEffect, useState } from 'react'

function relative(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ms).toLocaleDateString()
}

export function TimeAgo({ iso }: { iso: string }) {
  const ms = new Date(iso).getTime()
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  return (
    <time dateTime={iso} title={new Date(ms).toLocaleString()} suppressHydrationWarning>
      {relative(ms)}
    </time>
  )
}
