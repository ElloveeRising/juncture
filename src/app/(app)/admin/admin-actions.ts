'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users, posts, comments, reports, creatorGrants } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { destroyAllSessionsFor } from '@/lib/session'

export type AdminActionState = { error?: string; ok?: string }

/** Promote a supporter to creator, recording the contribution in creator_grants. */
export async function promoteUserAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const userId = Number(formData.get('userId'))
  const note = String(formData.get('note') ?? '').trim()
  if (!Number.isInteger(userId)) return { error: 'Invalid user.' }
  if (!note) return { error: 'Add a note describing the art they contributed (the grant is logged).' }

  const db = getDb()
  const u = db.select().from(users).where(eq(users.id, userId)).get()
  if (!u) return { error: 'User not found.' }
  if (u.role === 'admin') return { error: 'Cannot change an admin.' }
  if (u.role === 'creator') return { error: 'Already a creator.' }

  db.update(users).set({ role: 'creator' }).where(eq(users.id, userId)).run()
  // The load-bearing audit row: every promotion is recorded here.
  db.insert(creatorGrants).values({ userId, grantedBy: admin.id, note }).run()

  revalidatePath('/admin/users')
  return { ok: `Promoted @${u.handle} to creator.` }
}

export async function demoteUserAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const userId = Number(formData.get('userId'))
  if (!Number.isInteger(userId)) return { error: 'Invalid user.' }
  if (userId === admin.id) return { error: 'You cannot demote yourself.' }

  const db = getDb()
  const u = db.select().from(users).where(eq(users.id, userId)).get()
  if (!u) return { error: 'User not found.' }
  if (u.role === 'admin') return { error: 'Cannot change an admin.' }
  if (u.role === 'supporter') return { error: 'Already a supporter.' }

  db.update(users).set({ role: 'supporter' }).where(eq(users.id, userId)).run()
  revalidatePath('/admin/users')
  return { ok: `Demoted @${u.handle} to supporter.` }
}

export async function setSuspendedAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const userId = Number(formData.get('userId'))
  const suspend = formData.get('suspend') === '1'
  if (!Number.isInteger(userId)) return { error: 'Invalid user.' }
  if (userId === admin.id) return { error: 'You cannot suspend yourself.' }

  const db = getDb()
  const u = db.select().from(users).where(eq(users.id, userId)).get()
  if (!u) return { error: 'User not found.' }
  if (u.role === 'admin') return { error: 'Cannot suspend an admin.' }

  db.update(users)
    .set({ status: suspend ? 'suspended' : 'active' })
    .where(eq(users.id, userId))
    .run()
  // Suspending also kills active sessions so the block takes effect immediately.
  if (suspend) destroyAllSessionsFor(userId)

  revalidatePath('/admin/users')
  return { ok: suspend ? `Suspended @${u.handle}.` : `Reinstated @${u.handle}.` }
}

/** Soft-delete any post or comment (admin override, e.g. from the report queue). */
export async function adminDeleteContentAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const targetType = String(formData.get('targetType'))
  const targetId = Number(formData.get('targetId'))
  if (!Number.isInteger(targetId)) return

  const db = getDb()
  if (targetType === 'post') {
    db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, targetId)).run()
  } else if (targetType === 'comment') {
    db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, targetId)).run()
  }
  revalidatePath('/admin/reports')
  revalidatePath('/feed')
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const reportId = Number(formData.get('reportId'))
  if (!Number.isInteger(reportId)) return
  getDb().update(reports).set({ status: 'resolved' }).where(eq(reports.id, reportId)).run()
  revalidatePath('/admin/reports')
}
