import { defineConfig } from 'drizzle-kit'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const rawDataDir = process.env.DATA_DIR ?? './data'
const dataDir = path.isAbsolute(rawDataDir)
  ? rawDataDir
  : path.resolve(process.cwd(), rawDataDir)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(dataDir, 'vitrine.db'),
  },
})
