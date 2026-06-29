import 'server-only'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { sessions } from '@/db/schema'
import { BASE_URL } from '@/lib/config'

export const SESSION_COOKIE = 'juncture_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

// We store only a hash of the token in the DB; the raw token lives in the
// cookie. A leaked DB therefore cannot be used to impersonate anyone.
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function isSecureContext(): boolean {
  return BASE_URL.startsWith('https://') || process.env.NODE_ENV === 'production'
}

/** Create a session row + set the cookie. Returns the raw token. */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const id = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  getDb().insert(sessions).values({ id, userId, expiresAt }).run()

  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })

  return token
}

/** Resolve the current session row from the cookie, or null. Clears expired/invalid. */
export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null

  const id = hashToken(token)
  const row = getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .get()

  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) {
    getDb().delete(sessions).where(eq(sessions.id, id)).run()
    return null
  }
  return row.userId
}

/** Destroy the current session (DB row + cookie). */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) {
    getDb().delete(sessions).where(eq(sessions.id, hashToken(token))).run()
  }
  jar.delete(SESSION_COOKIE)
}

/** Invalidate every session belonging to a user (used after password change). */
export function destroyAllSessionsFor(userId: number): void {
  getDb().delete(sessions).where(eq(sessions.userId, userId)).run()
}
