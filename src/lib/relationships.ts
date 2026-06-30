import 'server-only'
import { and, eq, or } from 'drizzle-orm'
import { getDb } from '@/db'
import { blocks, mutes } from '@/db/schema'

/** True if a has blocked b. */
export function hasBlocked(aId: number, bId: number): boolean {
  return !!getDb()
    .select({ x: blocks.blockerId })
    .from(blocks)
    .where(and(eq(blocks.blockerId, aId), eq(blocks.blockedId, bId)))
    .get()
}

/** True if either user has blocked the other — a block severs both directions. */
export function blockedEitherWay(aId: number, bId: number): boolean {
  return !!getDb()
    .select({ x: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, aId), eq(blocks.blockedId, bId)),
        and(eq(blocks.blockerId, bId), eq(blocks.blockedId, aId)),
      ),
    )
    .get()
}

export function hasMuted(muterId: number, mutedId: number): boolean {
  return !!getDb()
    .select({ x: mutes.muterId })
    .from(mutes)
    .where(and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)))
    .get()
}
