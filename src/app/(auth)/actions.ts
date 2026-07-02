'use server'

import { redirect } from 'next/navigation'
import { eq, or } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { hashPassword, verifyPassword, getDummyHash } from '@/lib/password'
import { createSession } from '@/lib/session'
import { isFounderEmail } from '@/db/bootstrap'
import { creatorGrants } from '@/db/schema'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import {
  normalizeUsername,
  normalizeEmail,
  validatePassword,
} from '@/lib/validation'

export type AuthState = { error?: string }

function uniqueConstraintField(err: unknown): 'username' | 'email' | 'handle' | null {
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg.includes('UNIQUE')) return null
  if (msg.includes('users.username')) return 'username'
  if (msg.includes('users.email')) return 'email'
  if (msg.includes('users.handle')) return 'handle'
  return null
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp()
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000) // 5/hour/IP
  if (!rl.ok) return { error: 'Too many sign-up attempts. Please try again later.' }

  const u = normalizeUsername(String(formData.get('username') ?? ''))
  if (u.error) return { error: u.error }
  const e = normalizeEmail(String(formData.get('email') ?? ''))
  if (e.error) return { error: e.error }
  const p = validatePassword(String(formData.get('password') ?? ''))
  if (p.error) return { error: p.error }

  const passwordHash = await hashPassword(p.value!)

  // The founding trio (Ryan, Jesse, Ali) start co-equal: if this email is on
  // the founders list, they come in as an arbiter, not a supporter.
  const founder = isFounderEmail(e.value!)

  let newUserId: number
  try {
    const result = getDb()
      .insert(users)
      .values({
        username: u.value!,
        email: e.value!,
        passwordHash,
        role: founder ? 'admin' : 'supporter', // otherwise posting is earned
        displayName: u.value!,
        handle: u.value!,
      })
      .run()
    newUserId = Number(result.lastInsertRowid)
    if (founder) {
      getDb()
        .insert(creatorGrants)
        .values({ userId: newUserId, grantedBy: newUserId, note: '[arbiter] Founding member of A Schell Company' })
        .run()
    }
  } catch (err) {
    const field = uniqueConstraintField(err)
    if (field === 'username' || field === 'handle') {
      return { error: 'That username is already taken.' }
    }
    if (field === 'email') return { error: 'An account with that email already exists.' }
    throw err
  }

  await createSession(newUserId)
  redirect('/feed')
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp()
  const rl = rateLimit(`login:${ip}`, 8, 15 * 60 * 1000) // 8 per 15 min per IP
  if (!rl.ok) {
    return { error: `Too many attempts. Try again in ${rl.retryAfterSec} seconds.` }
  }

  const identifier = String(formData.get('identifier') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!identifier || !password) {
    return { error: 'Enter your username/email and password.' }
  }

  // Second limiter keyed by the account being targeted — an attacker spoofing
  // X-Forwarded-For (when not behind the tunnel) still can't hammer one account.
  const rlId = rateLimit(`login-id:${identifier}`, 10, 15 * 60 * 1000)
  if (!rlId.ok) {
    return { error: `Too many attempts. Try again in ${rlId.retryAfterSec} seconds.` }
  }

  const user = getDb()
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .get()

  // Always run a verify to keep timing roughly constant whether or not the
  // user exists, then give a single generic error (no account enumeration).
  const hash = user?.passwordHash ?? (await getDummyHash())
  const ok = await verifyPassword(hash, password)

  if (!user || !ok) return { error: 'Incorrect username/email or password.' }
  if (user.status === 'suspended') {
    return { error: 'This account is suspended. Contact the administrator.' }
  }

  await createSession(user.id)
  redirect('/feed')
}
