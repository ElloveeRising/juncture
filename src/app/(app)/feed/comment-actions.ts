'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { comments } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { getPostById } from '@/lib/posts'
import { blockedEitherWay } from '@/lib/relationships'
import { getCommentById, topLevelAncestorId } from '@/lib/comments'
import { notify } from '@/lib/notifications'
import { COMMENT_MAX, type CommentState } from '@/lib/comment-constants'

export async function addCommentAction(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const user = await requireUser() // supporters CAN comment

  const rl = rateLimit(`comment:${user.id}`, 40, 10 * 60 * 1000)
  if (!rl.ok) return { error: 'You are commenting too quickly. Slow down a touch.' }

  const postId = Number(formData.get('postId'))
  const body = String(formData.get('body') ?? '').trim()
  const parentRaw = formData.get('parentId')
  const parentId = parentRaw ? Number(parentRaw) : null

  if (!Number.isInteger(postId)) return { error: 'Invalid post.' }
  if (!body) return { error: 'Write a comment first.' }
  if (body.length > COMMENT_MAX) return { error: `Comment is too long (max ${COMMENT_MAX}).` }

  const post = getPostById(postId)
  if (!post || post.deletedAt) return { error: 'Post not found.' }
  // A block severs interaction both ways. Same generic error as a missing
  // post so the block itself isn't disclosed.
  if (blockedEitherWay(user.id, post.authorId)) return { error: 'Post not found.' }

  // Enforce a single level of threading: a reply always attaches to the
  // top-level ancestor, never to another reply.
  let normalizedParent: number | null = null
  let parentAuthorId: number | null = null
  if (parentId) {
    const parent = getCommentById(parentId)
    if (parent && parent.postId === postId) {
      normalizedParent = topLevelAncestorId(parentId)
      parentAuthorId = parent.authorId
    }
  }

  const res = getDb()
    .insert(comments)
    .values({ postId, authorId: user.id, body, parentId: normalizedParent })
    .run()
  const commentId = Number(res.lastInsertRowid)

  // Notify the post author, and the parent commenter if replying.
  notify(post.authorId, user.id, 'comment', commentId)
  if (parentAuthorId && parentAuthorId !== post.authorId) {
    notify(parentAuthorId, user.id, 'comment', commentId)
  }

  revalidatePath('/feed')
  return { ok: true }
}

export async function editCommentAction(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const user = await requireUser()
  const commentId = Number(formData.get('commentId'))
  const body = String(formData.get('body') ?? '').trim()
  if (!Number.isInteger(commentId)) return { error: 'Invalid comment.' }
  if (!body) return { error: 'Comment cannot be empty.' }
  if (body.length > COMMENT_MAX) return { error: `Comment is too long (max ${COMMENT_MAX}).` }

  const c = getCommentById(commentId)
  if (!c || c.deletedAt) return { error: 'Comment not found.' }
  if (c.authorId !== user.id) return { error: 'You can only edit your own comments.' }

  getDb()
    .update(comments)
    .set({ body, editedAt: new Date() })
    .where(eq(comments.id, commentId))
    .run()
  revalidatePath('/feed')
  return { ok: true }
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const commentId = Number(formData.get('commentId'))
  if (!Number.isInteger(commentId)) return

  const c = getCommentById(commentId)
  if (!c || c.deletedAt) return
  // Author may delete own; admin may delete any.
  if (c.authorId !== user.id && user.role !== 'admin') return

  getDb()
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, commentId))
    .run()
  revalidatePath('/feed')
}
