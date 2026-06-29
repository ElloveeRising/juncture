import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { getDataDir, getDbPath } from '../lib/config'
import path from 'path'
import fs from 'fs'

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

declare global {
  // Survive Next.js hot-reload in dev without opening multiple connections
  // eslint-disable-next-line no-var
  var __vitrineDb: DrizzleDb | undefined
}

export function getDb(): DrizzleDb {
  if (!global.__vitrineDb) {
    const dataDir = getDataDir()
    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(path.join(dataDir, 'media'), { recursive: true })

    const sqlite = new Database(getDbPath())
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')

    global.__vitrineDb = drizzle(sqlite, { schema })
  }
  return global.__vitrineDb
}
