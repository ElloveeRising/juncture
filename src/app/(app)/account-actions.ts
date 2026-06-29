'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  destroyCurrentSession,
  destroyAllSessionsFor,
  createSession,
} from '@/lib/session'
import { validatePassword } from '@/lib/validation'

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession()
  redirect('/login')
}

export type ChangePwState = { error?: string; ok?: boolean }

export async function changePasswordAction(
  _prev: ChangePwState,
  formData: FormData,
): Promise<ChangePwState> {
  const user = await requireUser()

  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const row = getDb().select().from(users).where(eq(users.id, user.id)).get()
  if (!row) return { error: 'Account not found.' }

  const ok = await verifyPassword(row.passwordHash, current)
  if (!ok) return { error: 'Current password is incorrect.' }

  if (next !== confirm) return { error: 'New passwords do not match.' }
  const v = validatePassword(next)
  if (v.error) return { error: v.error }

  const newHash = await hashPassword(v.value!)
  getDb().update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id)).run()

  // Invalidate every existing session (including this one) then re-establish
  // the current device, so a stolen old session can't survive a password change.
  destroyAllSessionsFor(user.id)
  await createSession(user.id)

  return { ok: true }
}
