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
