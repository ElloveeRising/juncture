'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts } from '@/db/schema'
import { requireUser, canPost } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { getPostById } from '@/lib/posts'
import { POST_MAX, type PostState } from '@/lib/post-constants'

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
  if (!body) return { error: 'Write something first.' }
  if (body.length > POST_MAX) {
    return { error: `Post is too long (max ${POST_MAX} characters).` }
  }

  getDb().insert(posts).values({ authorId: user.id, body }).run()
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
