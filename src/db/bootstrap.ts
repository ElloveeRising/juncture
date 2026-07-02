import { eq } from 'drizzle-orm'
import { getDb } from './index'
import { users, creatorGrants } from './schema'
import { hashPassword } from '@/lib/password'

// Creates Ryan's admin account on first boot from ADMIN_BOOTSTRAP_* env vars.
// Self-disabling: once any admin exists, this never runs again, so the
// bootstrap credentials can be removed from the environment afterward.
export async function bootstrapAdmin(): Promise<void> {
  const db = getDb()

  const existingAdmin = db.select().from(users).where(eq(users.role, 'admin')).get()
  if (existingAdmin) return

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim().toLowerCase()
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD

  if (!email || !username || !password) {
    console.warn(
      '[juncture] no admin exists and ADMIN_BOOTSTRAP_* not fully set — ' +
        'set them in .env to create the first admin account.',
    )
    return
  }

  const passwordHash = await hashPassword(password)
  const result = db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
      role: 'admin',
      displayName: username,
      handle: username,
    })
    .run()

  // Record the founding grant for audit symmetry with later promotions.
  db.insert(creatorGrants)
    .values({
      userId: Number(result.lastInsertRowid),
      grantedBy: Number(result.lastInsertRowid),
      note: 'Founding admin (bootstrap)',
    })
    .run()

  console.log(
    `[juncture] created bootstrap admin "${username}". ` +
      'Remove ADMIN_BOOTSTRAP_PASSWORD from your environment now.',
  )
}

/**
 * Founding trio, co-equal by design. FOUNDER_EMAILS is a comma-separated list
 * (e.g. Ryan, Jesse, Ali). Runs on EVERY boot and is idempotent: the moment a
 * listed person signs up (a normal account, their own password), they're raised
 * to arbiter automatically — nobody has to "grant" anybody. No shared passwords,
 * no first-among-equals. Each promotion is logged in creator_grants once.
 */
export function founderEmails(): Set<string> {
  return new Set(
    (process.env.FOUNDER_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isFounderEmail(email: string): boolean {
  return founderEmails().has(email.trim().toLowerCase())
}

export async function seedFounders(): Promise<void> {
  const emails = founderEmails()
  if (!emails.size) return

  const db = getDb()
  for (const email of emails) {
    const u = db.select().from(users).where(eq(users.email, email)).get()
    if (!u) continue // hasn't signed up yet — they'll be promoted when they do
    if (u.role === 'admin') continue // already co-equal
    db.update(users).set({ role: 'admin' }).where(eq(users.id, u.id)).run()
    db.insert(creatorGrants)
      .values({ userId: u.id, grantedBy: u.id, note: '[arbiter] Founding member of A Schell Company' })
      .run()
    console.log(`[juncture] ${email} recognized as a founding arbiter.`)
  }
}
