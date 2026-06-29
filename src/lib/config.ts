import path from 'path'

export const APP_NAME = process.env.APP_NAME ?? 'Vitrine'
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
export const PORT = parseInt(process.env.PORT ?? '3000', 10)
export const SESSION_SECRET = process.env.SESSION_SECRET ?? ''

export function getDataDir(): string {
  const raw = process.env.DATA_DIR ?? './data'
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
}

export function getMediaDir(): string {
  return path.join(getDataDir(), 'media')
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'vitrine.db')
}
