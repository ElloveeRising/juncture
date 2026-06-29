import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canPost } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { buildLinkPreview, extractFirstUrl } from '@/lib/linkpreview'

export const dynamic = 'force-dynamic'

// Live unfurl for the composer. Restricted to users who can post, and rate
// limited, so it can't be abused as an open server-side fetch proxy.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !canPost(user)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`unfurl:${user.id}`, 30, 5 * 60 * 1000)
  if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const raw = req.nextUrl.searchParams.get('url') ?? ''
  const url = extractFirstUrl(raw) ?? (raw.trim() || null)
  if (!url) return NextResponse.json({ preview: null })

  const preview = await buildLinkPreview(url)
  // Nothing useful found — tell the client so it shows nothing.
  if (!preview.title && !preview.description && !preview.imagePath) {
    return NextResponse.json({ preview: null })
  }
  return NextResponse.json({ preview })
}
