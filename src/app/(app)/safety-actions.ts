'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { blocks, mutes, reports, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { hasBlocked, hasMuted } from '@/lib/relationships'

export type ReportState = { error?: string; ok?: boolean }

function userExists(id: number): boolean {
  return !!getDb().select({ x: users.id }).from(users).where(eq(users.id, id)).get()
}

/** Block / unblock a user. A block severs feed visibility + DMs both ways. */
export async function toggleBlock(targetId: number): Promise<{ blocked: boolean; error?: string }> {
  const me = await requireUser()
  if (targetId === me.id) return { blocked: false, error: 'You cannot block yourself.' }
  if (!userExists(targetId)) return { blocked: false, error: 'User not found.' }

  const db = getDb()
  if (hasBlocked(me.id, targetId)) {
    db.delete(blocks)
      .where(and(eq(blocks.blockerId, me.id), eq(blocks.blockedId, targetId)))
      .run()
    revalidatePath('/feed')
    return { blocked: false }
  }
  db.insert(blocks).values({ blockerId: me.id, blockedId: targetId }).run()
  // Blocking also clears any mute (block is the stronger relationship).
  db.delete(mutes).where(and(eq(mutes.muterId, me.id), eq(mutes.mutedId, targetId))).run()
  revalidatePath('/feed')
  return { blocked: true }
}

/** Mute / unmute a user — one-directional; hides their posts from your feed only. */
export async function toggleMute(targetId: number): Promise<{ muted: boolean; error?: string }> {
  const me = await requireUser()
  if (targetId === me.id) return { muted: false, error: 'You cannot mute yourself.' }
  if (!userExists(targetId)) return { muted: false, error: 'User not found.' }

  const db = getDb()
  if (hasMuted(me.id, targetId)) {
    db.delete(mutes).where(and(eq(mutes.muterId, me.id), eq(mutes.mutedId, targetId))).run()
    revalidatePath('/feed')
    return { muted: false }
  }
  db.insert(mutes).values({ muterId: me.id, mutedId: targetId }).run()
  revalidatePath('/feed')
  return { muted: true }
}

/** Report a post, comment, or user to the admin queue. */
export async function reportTarget(
  targetType: 'post' | 'comment' | 'user',
  targetId: number,
  reason: string,
): Promise<ReportState> {
  const me = await requireUser()
  const rl = rateLimit(`report:${me.id}`, 20, 60 * 60 * 1000)
  if (!rl.ok) return { error: 'You have reported a lot recently. Please slow down.' }

  if (!['post', 'comment', 'user'].includes(targetType)) return { error: 'Invalid target.' }
  if (!Number.isInteger(targetId)) return { error: 'Invalid target.' }
  const trimmed = reason.trim()
  if (!trimmed) return { error: 'Please say what’s wrong.' }
  if (trimmed.length > 500) return { error: 'Reason is too long (max 500).' }

  // Avoid piling up duplicate open reports from the same person on the same item.
  const existing = getDb()
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, me.id),
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, 'open'),
      ),
    )
    .get()
  if (existing) return { ok: true } // already reported; treat as success

  getDb()
    .insert(reports)
    .values({ reporterId: me.id, targetType, targetId, reason: trimmed })
    .run()
  return { ok: true }
}
