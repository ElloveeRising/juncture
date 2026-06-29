import 'server-only'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { reactions } from '@/db/schema'

export type TargetType = 'post' | 'comment'
export type ReactionSummary = { likeCount: number; likedByMe: boolean }

const EMPTY: ReactionSummary = { likeCount: 0, likedByMe: false }

/** Like counts + whether the viewer liked, for a batch of targets. */
export function getReactionSummaries(
  targetType: TargetType,
  ids: number[],
  viewerId: number,
): Map<number, ReactionSummary> {
  const result = new Map<number, ReactionSummary>()
  if (!ids.length) return result

  const db = getDb()
  const counts = db
    .select({ targetId: reactions.targetId, c: sql<number>`count(*)` })
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.kind, 'like'),
        inArray(reactions.targetId, ids),
      ),
    )
    .groupBy(reactions.targetId)
    .all()

  const mine = db
    .select({ targetId: reactions.targetId })
    .from(reactions)
    .where(
      and(
        eq(reactions.userId, viewerId),
        eq(reactions.targetType, targetType),
        eq(reactions.kind, 'like'),
        inArray(reactions.targetId, ids),
      ),
    )
    .all()

  const mineSet = new Set(mine.map((m) => m.targetId))
  for (const id of ids) result.set(id, { ...EMPTY })
  for (const row of counts) {
    result.set(row.targetId, {
      likeCount: Number(row.c),
      likedByMe: mineSet.has(row.targetId),
    })
  }
  for (const id of mineSet) {
    const cur = result.get(id)
    if (cur) cur.likedByMe = true
  }
  return result
}
