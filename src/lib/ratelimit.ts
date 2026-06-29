import 'server-only'
import { headers } from 'next/headers'

// Simple in-memory sliding-window limiter. Sufficient for a single-process,
// single-box deployment (which is exactly Juncture's target). If this ever
// runs multi-process, swap the Map for a shared store.
type Bucket = { count: number; resetAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __juncRateBuckets: Map<string, Bucket> | undefined
}

const buckets = (global.__juncRateBuckets ??= new Map<string, Bucket>())

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()
  const b = buckets.get(key)

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }

  b.count += 1
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 }
}

/** Best-effort client IP from proxy headers (Cloudflare Tunnel sets these). */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip') ?? 'unknown'
}

// Opportunistic cleanup so the Map doesn't grow unbounded.
export function sweepRateBuckets(): void {
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}
