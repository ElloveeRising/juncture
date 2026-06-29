'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, postMedia } from '@/db/schema'
import { requireUser, canPost } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { getPostById } from '@/lib/posts'
import { POST_MAX, type PostState } from '@/lib/post-constants'
import {
  processAndStoreImage,
  storeAudio,
  isAllowedImage,
  isAllowedAudio,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
  MAX_IMAGES_PER_POST,
  type StoredImage,
  type StoredAudio,
} from '@/lib/media'
import { extractFirstUrl, createPostLinkPreview } from '@/lib/linkpreview'

export async function createPostAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const user = await requireUser()
  // Server-side permission enforcement — the contribution-wall. Never trust the
  // client's hidden composer; a supporter POSTing directly is rejected here.
  if (!canPost(user)) return { error: 'Only creators can post.' }

  const rl = rateLimit(`post:${user.id}`, 20, 10 * 60 * 1000) // 20 posts / 10 min
  if (!rl.ok) return { error: 'You are posting too quickly. Take a breath.' }

  const body = String(formData.get('body') ?? '').trim()

  const imageFiles = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0)
  const audioRaw = formData.get('audio')
  const audioFile = audioRaw instanceof File && audioRaw.size > 0 ? audioRaw : null

  if (!body && imageFiles.length === 0 && !audioFile) {
    return { error: 'Write something or add a photo, audio, or link first.' }
  }
  if (body.length > POST_MAX) {
    return { error: `Post is too long (max ${POST_MAX} characters).` }
  }
  if (imageFiles.length > MAX_IMAGES_PER_POST) {
    return { error: `Up to ${MAX_IMAGES_PER_POST} images per post.` }
  }

  // Validate every upload against the type allowlist + size cap BEFORE doing
  // any processing or writing the post.
  for (const f of imageFiles) {
    if (!isAllowedImage(f)) {
      return { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' }
    }
    if (f.size > MAX_IMAGE_BYTES) {
      return { error: `Each image must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` }
    }
  }
  if (audioFile) {
    if (!isAllowedAudio(audioFile)) {
      return { error: 'Unsupported audio type. Use MP3, OGG, WAV, or M4A.' }
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return { error: `Audio must be under ${MAX_AUDIO_BYTES / 1024 / 1024} MB.` }
    }
  }

  // Process + store media first; if anything fails we never create the post.
  const stored: (StoredImage | StoredAudio)[] = []
  try {
    for (const f of imageFiles) stored.push(await processAndStoreImage(f))
    if (audioFile) stored.push(await storeAudio(audioFile))
  } catch {
    return { error: 'Could not process one of your uploads. Please try again.' }
  }

  const db = getDb()
  const res = db.insert(posts).values({ authorId: user.id, body: body || null }).run()
  const postId = Number(res.lastInsertRowid)

  let position = 0
  for (const m of stored) {
    if (m.kind === 'image') {
      db.insert(postMedia)
        .values({
          postId,
          kind: 'image',
          path: m.path,
          thumbPath: m.thumbPath,
          mime: m.mime,
          width: m.width,
          height: m.height,
          position: position++,
        })
        .run()
    } else {
      db.insert(postMedia)
        .values({ postId, kind: 'audio', path: m.path, mime: m.mime, position: position++ })
        .run()
    }
  }

  // Unfurl the first link in the body (best-effort; never blocks/fails the post).
  const firstUrl = extractFirstUrl(body)
  if (firstUrl) await createPostLinkPreview(postId, firstUrl)

  revalidatePath('/feed')
  return { ok: true }
}

export async function editPostAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const user = await requireUser()
  const postId = Number(formData.get('postId'))
  const body = String(formData.get('body') ?? '').trim()

  if (!Number.isInteger(postId)) return { error: 'Invalid post.' }
  if (!body) return { error: 'Post cannot be empty.' }
  if (body.length > POST_MAX) return { error: `Post is too long (max ${POST_MAX}).` }

  const post = getPostById(postId)
  if (!post || post.deletedAt) return { error: 'Post not found.' }
  // Only the author may edit their own post.
  if (post.authorId !== user.id) return { error: 'You can only edit your own posts.' }

  getDb()
    .update(posts)
    .set({ body, editedAt: new Date() })
    .where(eq(posts.id, postId))
    .run()
  revalidatePath('/feed')
  return { ok: true }
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const postId = Number(formData.get('postId'))
  if (!Number.isInteger(postId)) return

  const post = getPostById(postId)
  if (!post || post.deletedAt) return
  // Author may delete own; admin may delete any (full delete-any UI is M7).
  if (post.authorId !== user.id && user.role !== 'admin') return

  // Soft delete — recoverable, per the privacy/safety principle.
  getDb().update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId)).run()
  revalidatePath('/feed')
}
