import 'server-only'
import sharp from 'sharp'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { getMediaDir } from '@/lib/config'
import {
  IMAGE_MIMES,
  AUDIO_MIMES,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
  MAX_IMAGES_PER_POST,
} from '@/lib/media-constants'

// Re-export the caps so server callers can keep importing them from '@/lib/media'.
export { MAX_IMAGE_BYTES, MAX_AUDIO_BYTES, MAX_IMAGES_PER_POST }

const MAX_DIM = 1600
const THUMB_DIM = 400

const AUDIO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
}

export type StoredImage = {
  kind: 'image'
  path: string // relative to media dir, e.g. "2026/06/<rand>.webp"
  thumbPath: string
  mime: string
  width: number
  height: number
}

export type StoredAudio = {
  kind: 'audio'
  path: string
  mime: string
}

function randName(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Group uploads into dated subdirs so no single folder grows unbounded.
function datedRelDir(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function writeMedia(relPath: string, data: Buffer): Promise<void> {
  const abs = path.join(getMediaDir(), relPath)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, data)
}

/**
 * Process and store an uploaded image.
 *
 * Critically for the anonymity guarantee: we `.rotate()` (which bakes EXIF
 * orientation into the pixels) and then re-encode WITHOUT calling
 * `withMetadata()`/`withExif()`. sharp drops all metadata by default, so the
 * stored file carries NO EXIF, NO GPS — nothing that could de-anonymize an
 * artist who didn't mean to share their location.
 */
export async function processAndStoreImage(file: File): Promise<StoredImage> {
  const buf = Buffer.from(await file.arrayBuffer())
  const isGif = file.type === 'image/gif'

  const base = `${datedRelDir()}/${randName()}`
  let relPath: string
  let mime: string
  let width: number
  let height: number

  if (isGif) {
    // Preserve animation; strip metadata; cap dimensions.
    const out = await sharp(buf, { animated: true })
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .gif()
      .toBuffer({ resolveWithObject: true })
    relPath = `${base}.gif`
    mime = 'image/gif'
    width = out.info.width
    // For animated GIFs sharp reports the full sprite-sheet height; derive the
    // per-frame height from pageHeight when available.
    height = (out.info as { pageHeight?: number }).pageHeight ?? out.info.height
    await writeMedia(relPath, out.data)
  } else {
    const out = await sharp(buf)
      .rotate() // auto-orient from EXIF, then metadata is dropped on encode
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    relPath = `${base}.webp`
    mime = 'image/webp'
    width = out.info.width
    height = out.info.height
    await writeMedia(relPath, out.data)
  }

  // Thumbnail (first frame for gifs), always webp, also metadata-free.
  const thumb = await sharp(buf, { animated: false })
    .rotate()
    .resize(THUMB_DIM, THUMB_DIM, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()
  const thumbPath = `${base}.thumb.webp`
  await writeMedia(thumbPath, thumb)

  return { kind: 'image', path: relPath, thumbPath, mime, width, height }
}

/**
 * Process and store an avatar: square cover-crop, ~256px, webp, metadata
 * stripped (same anonymity guarantee as post images). Returns the relative path.
 */
export async function processAndStoreAvatar(file: File): Promise<{ path: string } | null> {
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const out = await sharp(buf)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp({ quality: 85 })
      .toBuffer()
    const relPath = `${datedRelDir()}/avatar_${randName()}.webp`
    await writeMedia(relPath, out)
    return { path: relPath }
  } catch {
    return null
  }
}

/**
 * Process and store a profile banner: wide cover-crop (1600×400), webp,
 * metadata stripped. Recompression keeps banners ~100KB — storage never
 * notices. Returns the relative path, or null on failure.
 */
export async function processAndStoreBanner(file: File): Promise<{ path: string } | null> {
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const out = await sharp(buf)
      .rotate()
      .resize(1600, 400, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      .toBuffer()
    const relPath = `${datedRelDir()}/banner_${randName()}.webp`
    await writeMedia(relPath, out)
    return { path: relPath }
  } catch {
    return null
  }
}

/** Store an uploaded audio file as-is (no transcoding in v1). */
export async function storeAudio(file: File): Promise<StoredAudio> {
  const ext = AUDIO_EXT[file.type] ?? 'bin'
  const relPath = `${datedRelDir()}/${randName()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  await writeMedia(relPath, buf)
  return { kind: 'audio', path: relPath, mime: file.type }
}

/**
 * Process and store an image we fetched ourselves (e.g. a link-preview image),
 * given its raw bytes. Re-encoded to webp and stripped of metadata, exactly like
 * uploads — so we never hotlink an external host (which would leak member IPs)
 * and never store someone else's EXIF. Returns null on any failure.
 */
export async function storeFetchedImage(
  buf: Buffer,
): Promise<{ path: string; width: number; height: number } | null> {
  try {
    const out = await sharp(buf)
      .rotate()
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })
    const relPath = `${datedRelDir()}/${randName()}.webp`
    await writeMedia(relPath, out.data)
    return { path: relPath, width: out.info.width, height: out.info.height }
  } catch {
    return null
  }
}

export function isAllowedImage(file: File): boolean {
  return (IMAGE_MIMES as readonly string[]).includes(file.type)
}
export function isAllowedAudio(file: File): boolean {
  return (AUDIO_MIMES as readonly string[]).includes(file.type)
}
