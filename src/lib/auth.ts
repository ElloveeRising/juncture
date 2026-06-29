import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { getSessionUserId } from '@/lib/session'

export type Role = 'admin' | 'creator' | 'supporter'

export type CurrentUser = {
  id: number
  username: string
  email: string
  role: Role
  displayName: string
  handle: string
  avatarPath: string | null
  bio: string | null
  isAnonymous: boolean
  allowSupporterDms: boolean
  status: 'active' | 'suspended'
}

// Cached per-request so multiple calls in one render don't re-hit the DB.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId()
  if (userId === null) return null

  const row = getDb().select().from(users).where(eq(users.id, userId)).get()
  if (!row) return null
  if (row.status === 'suspended') return null

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
    handle: row.handle,
    avatarPath: row.avatarPath,
    bio: row.bio,
    isAnonymous: row.isAnonymous,
    allowSupporterDms: row.allowSupporterDms,
    status: row.status,
  }
})

/** Require a logged-in member or redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** Require posting privileges (creator or admin). */
export async function requireCreator(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== 'creator' && user.role !== 'admin') redirect('/feed')
  return user
}

/** Require admin (Ryan). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/feed')
  return user
}

export function canPost(user: { role: Role }): boolean {
  return user.role === 'creator' || user.role === 'admin'
}
