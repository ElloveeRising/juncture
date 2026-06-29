import 'server-only'
import dns from 'dns/promises'
import net from 'net'
import { and, desc, eq, gt } from 'drizzle-orm'
import { getDb } from '@/db'
import { linkPreviews } from '@/db/schema'
import { storeFetchedImage } from '@/lib/media'

const HTML_TIMEOUT_MS = 6000
const IMG_TIMEOUT_MS = 6000
const MAX_HTML_BYTES = 768 * 1024
const MAX_IMG_BYTES = 6 * 1024 * 1024
const MAX_REDIRECTS = 4
const USER_AGENT = 'JunctureBot/1.0 (+link preview; members-only)'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // reuse a URL's preview for 7 days

export type LinkPreviewData = {
  url: string
  title: string | null
  description: string | null
  imagePath: string | null
}

// ── URL extraction ───────────────────────────────────────────────────────────
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i

export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const m = URL_RE.exec(text)
  if (!m) return null
  // Trim common trailing punctuation that isn't part of the URL.
  return m[0].replace(/[.,;:!?]+$/, '')
}

// ── SSRF guard ───────────────────────────────────────────────────────────────
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true // link-local
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a >= 224) return true // multicast/reserved
    return false
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe80')) return true // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
    // IPv4-mapped ::ffff:a.b.c.d
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/)
    if (mapped) return isPrivateIp(mapped[1])
    return false
  }
  return true // unknown format — treat as unsafe
}

async function assertPublicHost(hostname: string): Promise<void> {
  // Reject hosts that resolve to private/loopback ranges — prevents using the
  // server as an SSRF proxy into the home network.
  const records = await dns.lookup(hostname, { all: true })
  if (!records.length) throw new Error('no DNS')
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('private address blocked')
  }
}

async function safeFetch(
  startUrl: string,
  { timeoutMs, maxBytes, accept }: { timeoutMs: number; maxBytes: number; accept: string },
): Promise<{ finalUrl: string; contentType: string; bytes: Buffer }> {
  let current = startUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('unsupported protocol')
    }
    await assertPublicHost(u.hostname)

    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': USER_AGENT, accept },
    })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error('redirect without location')
      current = new URL(loc, current).toString()
      continue
    }
    if (!res.ok) throw new Error(`http ${res.status}`)

    const contentType = res.headers.get('content-type') ?? ''
    const reader = res.body?.getReader()
    if (!reader) throw new Error('no body')
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error('response too large')
      }
      chunks.push(value)
    }
    return { finalUrl: current, contentType, bytes: Buffer.concat(chunks) }
  }
  throw new Error('too many redirects')
}

// ── OpenGraph parsing ────────────────────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function metaContent(html: string, property: string): string | null {
  // Match <meta property="og:x" content="..."> or content-first ordering, and
  // also name="..." for things like description.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      'i',
    ),
  ]
  for (const re of patterns) {
    const m = re.exec(html)
    if (m) return decodeEntities(m[1]).trim()
  }
  return null
}

function titleTag(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html)
  return m ? decodeEntities(m[1]).trim() : null
}

function clamp(s: string | null, max: number): string | null {
  if (!s) return null
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Cache ────────────────────────────────────────────────────────────────────
function cachedPreview(url: string): LinkPreviewData | null {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS)
  const row = getDb()
    .select()
    .from(linkPreviews)
    .where(and(eq(linkPreviews.url, url), gt(linkPreviews.fetchedAt, cutoff)))
    .orderBy(desc(linkPreviews.fetchedAt))
    .get()
  if (!row) return null
  return {
    url: row.url,
    title: row.title,
    description: row.description,
    imagePath: row.imagePath,
  }
}

/**
 * Build a link preview for a URL: returns cached data if fresh, otherwise
 * fetches the page, parses OpenGraph, re-hosts the image locally, and returns
 * the data (without persisting — the caller links it to a post). Returns a
 * bare-URL fallback (title=null) if anything fails, so previews never block a
 * post from being created.
 */
export async function buildLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
  const fallback: LinkPreviewData = {
    url: rawUrl,
    title: null,
    description: null,
    imagePath: null,
  }

  let url: string
  try {
    url = new URL(rawUrl).toString()
  } catch {
    return fallback
  }

  const cached = cachedPreview(url)
  if (cached) return cached

  try {
    const { finalUrl, contentType, bytes } = await safeFetch(url, {
      timeoutMs: HTML_TIMEOUT_MS,
      maxBytes: MAX_HTML_BYTES,
      accept: 'text/html,application/xhtml+xml',
    })
    if (!contentType.includes('html')) return { ...fallback, url }

    const html = bytes.toString('utf8')
    const title = clamp(metaContent(html, 'og:title') ?? titleTag(html), 200)
    const description = clamp(
      metaContent(html, 'og:description') ?? metaContent(html, 'description'),
      400,
    )
    const ogImage = metaContent(html, 'og:image') ?? metaContent(html, 'og:image:url')

    let imagePath: string | null = null
    if (ogImage) {
      try {
        const abs = new URL(ogImage, finalUrl).toString()
        const img = await safeFetch(abs, {
          timeoutMs: IMG_TIMEOUT_MS,
          maxBytes: MAX_IMG_BYTES,
          accept: 'image/*',
        })
        if (img.contentType.startsWith('image/')) {
          const stored = await storeFetchedImage(img.bytes)
          imagePath = stored?.path ?? null
        }
      } catch {
        // image fetch failed — keep title/description, drop the image
      }
    }

    if (!title && !description && !imagePath) return { ...fallback, url }
    return { url, title, description, imagePath }
  } catch {
    return { ...fallback, url }
  }
}

/** Build a preview and persist it against a post. Best-effort, never throws. */
export async function createPostLinkPreview(postId: number, rawUrl: string): Promise<void> {
  try {
    const data = await buildLinkPreview(rawUrl)
    // Only store rows that actually have preview content (skip bare fallbacks).
    if (!data.title && !data.description && !data.imagePath) return
    getDb()
      .insert(linkPreviews)
      .values({
        postId,
        url: data.url,
        title: data.title,
        description: data.description,
        imagePath: data.imagePath,
      })
      .run()
  } catch {
    // swallow — a missing preview must never break posting
  }
}
