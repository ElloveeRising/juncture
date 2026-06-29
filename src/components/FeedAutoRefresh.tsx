'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Near-live feed: soft-refresh the server component on an interval. router.refresh()
// preserves client state (e.g. the composer textarea), so it's unobtrusive.
// Pauses while the tab is hidden to avoid needless work.
export function FeedAutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const t = setInterval(tick, intervalMs)
    return () => clearInterval(t)
  }, [router, intervalMs])
  return null
}
