'use server'

import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { reactions, posts, comments } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { blockedEitherWay } from '@/lib/relationships'
import { notify } from '@/lib/notifications'

export type ToggleResult = { liked: boolean; count: number; error?: string }

type TargetType = 'post' | 'comment'

function targetAuthorId(targetType: TargetType, targetId: number): number | null {
  const db = getDb()
  if (targetType === 'post') {
    const p = db.select({ a: posts.authorId, d: posts.deletedAt }).from(posts).where(eq(posts.id, targetId)).get()
    return p && !p.d ? p.a : null
  }
  const c = db.select({ a: comments.authorId, d: comments.deletedAt }).from(comments).where(eq(comments.id, targetId)).get()
  return c && !c.d ? c.a : null
}

function likeCount(targetType: TargetType, targetId: number): number {
  const row = getDb()
    .select({ c: sql<number>`count(*)` })
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.kind, 'like'),
      ),
    )
    .get()
  return Number(row?.c ?? 0)
}

/** Toggle a 'like' on a post or comment. Returns the fresh summary. */
export async function toggleReaction(
  targetType: TargetType,
  targetId: number,
): Promise<ToggleResult> {
  const user = await requireUser() // supporters CAN react

  const rl = rateLimit(`react:${user.id}`, 120, 5 * 60 * 1000)
  if (!rl.ok) return { liked: false, count: likeCount(targetType, targetId), error: 'Too many reactions, slow down.' }

  if (targetType !== 'post' && targetType !== 'comment') {
    return { liked: false, count: 0, error: 'Invalid target.' }
  }
  const authorId = targetAuthorId(targetType, targetId)
  if (authorId === null) {
    return { liked: false, count: 0, error: 'That content is gone.' }
  }
  // A block severs reactions too — same generic error, block not disclosed.
  if (blockedEitherWay(user.id, authorId)) {
    return { liked: false, count: 0, error: 'That content is gone.' }
  }

  const db = getDb()
  const existing = db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      and(
        eq(reactions.userId, user.id),
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.kind, 'like'),
      ),
    )
    .get()

  let liked: boolean
  if (existing) {
    db.delete(reactions).where(eq(reactions.id, existing.id)).run()
    liked = false
  } else {
    const res = db
      .insert(reactions)
      .values({ userId: user.id, targetType, targetId, kind: 'like' })
      .run()
    liked = true
    notify(authorId, user.id, 'reaction', Number(res.lastInsertRowid))
  }

  return { liked, count: likeCount(targetType, targetId) }
}
