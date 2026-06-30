/**
 * media-gc.ts — garbage-collect orphaned media files.
 *
 * Why this exists
 * ───────────────
 * The live link-preview unfurl endpoint (/api/unfurl → buildLinkPreview in
 * src/lib/linkpreview.ts) downloads and re-hosts a remote OG image via
 * storeFetchedImage the moment a member pastes a URL into the composer — even
 * if they never actually post. Then, at post time, createPostLinkPreview runs
 * buildLinkPreview AGAIN, which (because the 7-day cache is keyed on a row that
 * only exists once a post is created) re-fetches and stores a SECOND copy. The
 * net effect: every previewed-but-abandoned link, and every previewed link that
 * IS posted, can leave one or more image files under DATA_DIR/media that no DB
 * row points at. Over time that orphaned set only grows.
 *
 * What this does
 * ──────────────
 * Walk every file under DATA_DIR/media and delete any that is NOT referenced by
 *   • post_media.path
 *   • post_media.thumb_path
 *   • link_previews.image_path
 *   • users.avatar_path
 *
 * Safety guarantees (this script only ever DELETES FILES, never DB rows):
 *   • Dry-run by default. Nothing is removed unless you pass --delete.
 *   • The DB must exist and be readable (opened read-only, fileMustExist). If we
 *     can't build the reference set we ABORT rather than treat everything as an
 *     orphan — a missing DB must never nuke the whole media tree.
 *   • Age guard: a file newer than --min-age minutes (default 60) is NEVER
 *     deleted, because it may have just been uploaded/fetched and not yet
 *     committed to its row. "Age" is the newer of mtime/birthtime — both track
 *     when the bytes were written. We deliberately ignore ctime/atime, which
 *     sync clients (OneDrive) and nightly backups bump without the file being
 *     new, and which would otherwise make the GC skip everything forever.
 *   • Only paths strictly under the media dir are ever touched.
 *
 * Usage
 * ─────
 *   npm run media-gc                 # dry run — list orphans, delete nothing
 *   npm run media-gc -- --delete     # actually delete orphans
 *   npm run media-gc -- --min-age=180  # only delete orphans older than 3h
 *   npm run media-gc -- --json       # machine-readable summary on stdout
 *
 * (Direct: `tsx scripts/media-gc.ts [flags]`.)
 *
 * Reads DATA_DIR from .env.local / .env, exactly like drizzle.config.ts.
 */
import path from 'path'
import fs from 'fs/promises'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import { getMediaDir, getDbPath } from '../src/lib/config'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

// ── CLI ──────────────────────────────────────────────────────────────────────
type Args = { delete: boolean; minAgeMins: number; json: boolean; help: boolean }

function parseArgs(argv: string[]): Args {
  const out: Args = { delete: false, minAgeMins: 60, json: false, help: false }
  for (const a of argv) {
    if (a === '--delete' || a === '-d') out.delete = true
    else if (a === '--json') out.json = true
    else if (a === '--help' || a === '-h') out.help = true
    else if (a.startsWith('--min-age=')) {
      const n = Number(a.slice('--min-age='.length))
      if (!Number.isFinite(n) || n < 0) {
        console.error(`Invalid --min-age value: ${a}`)
        process.exit(2)
      }
      out.minAgeMins = n
    } else {
      console.error(`Unknown argument: ${a}\nRun with --help for usage.`)
      process.exit(2)
    }
  }
  return out
}

const HELP = `media-gc — delete orphaned files under DATA_DIR/media

Orphans are files not referenced by post_media.path, post_media.thumb_path,
link_previews.image_path, or users.avatar_path.

Usage:
  tsx scripts/media-gc.ts [flags]      (or: npm run media-gc -- [flags])

Flags:
  -d, --delete         Actually delete orphans (default: dry run, list only)
      --min-age=<min>  Never delete files younger than this many minutes
                       (default: 60). A just-uploaded file may not have its DB
                       row yet, so we leave recent files alone.
      --json           Print a JSON summary to stdout instead of prose
  -h, --help           Show this help
`

// ── helpers ──────────────────────────────────────────────────────────────────
function normalizeRel(p: string): string {
  // DB stores forward-slash relative paths ("2026/06/x.webp"); on-disk relatives
  // use the OS separator. Normalize both to a forward-slash, no-leading-./ form.
  return p.replace(/\\/g, '/').replace(/^\.?\//, '').trim()
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return out
    throw err
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(abs)))
    else if (e.isFile()) out.push(abs)
  }
  return out
}

/** Post-order remove of any now-empty subdirectory (never the media root). */
async function pruneEmptyDirs(root: string): Promise<number> {
  let pruned = 0
  async function visit(dir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isDirectory()) await visit(path.join(dir, e.name))
    }
    if (dir !== root) {
      const after = await fs.readdir(dir)
      if (after.length === 0) {
        await fs.rmdir(dir)
        pruned++
      }
    }
  }
  await visit(root)
  return pruned
}

function loadReferencedPaths(dbPath: string): Set<string> {
  // Read-only + fileMustExist: if the DB is missing we throw and abort, rather
  // than open an empty one and conclude that every media file is an orphan.
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const refs = new Set<string>()
    const add = (v: unknown) => {
      if (typeof v === 'string' && v.trim()) refs.add(normalizeRel(v))
    }
    for (const r of db
      .prepare('SELECT path, thumb_path FROM post_media')
      .all() as Array<{ path: string; thumb_path: string | null }>) {
      add(r.path)
      add(r.thumb_path)
    }
    for (const r of db
      .prepare('SELECT image_path FROM link_previews')
      .all() as Array<{ image_path: string | null }>) {
      add(r.image_path)
    }
    for (const r of db
      .prepare('SELECT avatar_path FROM users')
      .all() as Array<{ avatar_path: string | null }>) {
      add(r.avatar_path)
    }
    return refs
  } finally {
    db.close()
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
type OrphanInfo = { rel: string; abs: string; size: number; ageMs: number }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(HELP)
    return
  }

  const mediaDir = getMediaDir()
  const dbPath = getDbPath()
  const minAgeMs = args.minAgeMins * 60_000
  const now = Date.now()

  const log = (s = '') => {
    if (!args.json) console.log(s)
  }

  let referenced: Set<string>
  try {
    referenced = loadReferencedPaths(dbPath)
  } catch (err: unknown) {
    console.error(
      `Refusing to run: could not read referenced paths from ${dbPath}\n` +
        `  ${(err as Error).message}\n` +
        `  (Aborting so a missing/locked DB can never cause mass deletion.)`,
    )
    process.exit(1)
  }

  const files = await walk(mediaDir)

  let totalSize = 0
  const orphans: OrphanInfo[] = []
  const skippedTooNew: OrphanInfo[] = []

  for (const abs of files) {
    const rel = normalizeRel(path.relative(mediaDir, abs))
    let st
    try {
      st = await fs.stat(abs)
    } catch {
      continue // vanished mid-scan; ignore
    }
    totalSize += st.size
    if (referenced.has(rel)) continue

    // Use write/creation time only. ctime & atime get bumped by sync clients
    // and backups, so including them would make day-old files look brand new.
    const newest = Math.max(st.mtimeMs, st.birthtimeMs || 0)
    const ageMs = now - newest
    const info: OrphanInfo = { rel, abs, size: st.size, ageMs }
    if (ageMs < minAgeMs) skippedTooNew.push(info)
    else orphans.push(info)
  }

  orphans.sort((a, b) => a.rel.localeCompare(b.rel))
  const orphanBytes = orphans.reduce((s, o) => s + o.size, 0)

  // Delete phase
  let deleted = 0
  let deletedBytes = 0
  let prunedDirs = 0
  const failed: { rel: string; error: string }[] = []
  if (args.delete && orphans.length) {
    for (const o of orphans) {
      try {
        await fs.unlink(o.abs)
        deleted++
        deletedBytes += o.size
      } catch (err: unknown) {
        failed.push({ rel: o.rel, error: (err as Error).message })
      }
    }
    prunedDirs = await pruneEmptyDirs(mediaDir)
  }

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          mediaDir,
          dbPath,
          mode: args.delete ? 'delete' : 'dry-run',
          minAgeMins: args.minAgeMins,
          scanned: files.length,
          referenced: referenced.size,
          totalBytes: totalSize,
          orphans: orphans.map((o) => ({ path: o.rel, bytes: o.size, ageMs: o.ageMs })),
          orphanBytes,
          skippedTooNew: skippedTooNew.map((o) => ({ path: o.rel, bytes: o.size, ageMs: o.ageMs })),
          deleted,
          deletedBytes,
          prunedDirs,
          failed,
        },
        null,
        2,
      ) + '\n',
    )
    if (failed.length) process.exitCode = 1
    return
  }

  log(`media-gc  (${args.delete ? 'DELETE' : 'dry-run'})`)
  log(`  media dir : ${mediaDir}`)
  log(`  database  : ${dbPath}`)
  log(`  referenced: ${referenced.size} path(s) across post_media / link_previews / users`)
  log(`  on disk   : ${files.length} file(s), ${formatBytes(totalSize)}`)
  log(`  age guard : leaving files newer than ${args.minAgeMins} min`)
  log()

  if (skippedTooNew.length) {
    log(`Skipped ${skippedTooNew.length} unreferenced file(s) younger than ${args.minAgeMins} min:`)
    for (const o of skippedTooNew) {
      log(`  ~ ${o.rel}  (${formatBytes(o.size)}, age ${formatAge(o.ageMs)})`)
    }
    log()
  }

  if (!orphans.length) {
    log('No orphaned media files to remove. ✓')
    return
  }

  log(`Orphaned files (${orphans.length}, ${formatBytes(orphanBytes)}):`)
  for (const o of orphans) {
    const mark = args.delete ? '✗ deleted ' : '• would delete'
    log(`  ${mark} ${o.rel}  (${formatBytes(o.size)}, age ${formatAge(o.ageMs)})`)
  }
  log()

  if (args.delete) {
    log(`Deleted ${deleted} file(s), reclaimed ${formatBytes(deletedBytes)}.`)
    if (prunedDirs) log(`Pruned ${prunedDirs} empty director${prunedDirs === 1 ? 'y' : 'ies'}.`)
    if (failed.length) {
      log(`\n${failed.length} file(s) could not be deleted:`)
      for (const f of failed) log(`  ! ${f.rel}: ${f.error}`)
      process.exitCode = 1
    }
  } else {
    log(`Dry run — nothing deleted. Re-run with --delete to remove the above.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
