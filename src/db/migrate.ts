import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './index'
import path from 'path'

export function runMigrations(): void {
  const db = getDb()
  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  migrate(db, { migrationsFolder })
  console.log('[vitrine] database migrations up to date')
}
