import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { getMediaDir } from '@/lib/config'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  // Members-only: no session, no media. This is the auth-checked route the
  // spec requires — media is never served from a public static directory.
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { path: segments } = await ctx.params

  // Reject path traversal: no "..", and the resolved path must stay within the
  // media dir even after normalization.
  if (!segments?.length || segments.some((s) => s === '..' || s.includes('\0'))) {
    return new Response('Not found', { status: 404 })
  }
  const mediaDir = getMediaDir()
  const abs = path.resolve(mediaDir, ...segments)
  const rel = path.relative(mediaDir, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return new Response('Not found', { status: 404 })
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(abs)
    if (!stat.isFile()) return new Response('Not found', { status: 404 })
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const ext = path.extname(abs).toLowerCase()
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream'
  // `private` keeps shared caches (Cloudflare) from storing members-only media,
  // while still allowing the member's own browser to cache it.
  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=86400',
    'Accept-Ranges': 'bytes',
  }

  const range = req.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (m) {
      const size = stat.size
      let start = m[1] ? parseInt(m[1], 10) : 0
      let end = m[2] ? parseInt(m[2], 10) : size - 1
      if (Number.isNaN(start)) start = 0
      if (Number.isNaN(end) || end >= size) end = size - 1
      if (start > end || start >= size) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        })
      }
      const stream = createReadStream(abs, { start, end })
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        },
      })
    }
  }

  const stream = createReadStream(abs)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(stat.size) },
  })
}
