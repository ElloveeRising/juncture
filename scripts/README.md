# Maintenance scripts

Operational scripts for a running Juncture instance. Run them from the project
root so relative paths and `.env.local` resolve correctly.

## `media-gc.ts` — orphaned media garbage collector

Deletes image/audio files under `DATA_DIR/media` that no longer belong to any
database row.

### Why orphans accumulate

The composer's live link-preview unfurl (`/api/unfurl` →
`buildLinkPreview` in [`src/lib/linkpreview.ts`](../src/lib/linkpreview.ts))
downloads and re-hosts a remote OpenGraph image via `storeFetchedImage` the
moment a member pastes a URL — **even if they never post**. And when a link
*is* posted, `createPostLinkPreview` runs `buildLinkPreview` a second time,
which can store another copy. Both paths can leave `.webp` files under
`DATA_DIR/media` that nothing in the DB references. Avatar replacements and
abandoned uploads can leak the same way. Left alone, that set only grows.

### What it keeps vs. deletes

A file is **kept** if its media-relative path matches any of:

| Table           | Column        |
| --------------- | ------------- |
| `post_media`    | `path`        |
| `post_media`    | `thumb_path`  |
| `link_previews` | `image_path`  |
| `users`         | `avatar_path` |

Every other file under `DATA_DIR/media` is an **orphan candidate**.

### Safety

This script **only ever deletes files — never database rows.** On top of that:

- **Dry-run by default.** It prints what it *would* delete and exits. You must
  pass `--delete` to remove anything.
- **Age guard.** A file newer than `--min-age` minutes (default **60**) is never
  deleted — it may have just been uploaded/fetched and not yet committed to its
  row. "Age" is the newer of mtime/birthtime (when the bytes were written);
  ctime/atime are ignored on purpose, since sync clients and backups bump them
  without the file being new.
- **Aborts if the DB can't be read.** The database is opened read-only and must
  exist; if the reference set can't be built the script aborts (exit 1) rather
  than treat the whole media tree as orphaned. A missing or locked DB can never
  trigger mass deletion.
- Only paths strictly under `DATA_DIR/media` are touched. Empty subdirectories
  left behind after a delete are pruned (never the media root).

### Usage

```sh
# Dry run — list orphans, delete nothing (safe to run anytime)
npm run media-gc

# Actually delete orphans older than the default 1 hour
npm run media-gc -- --delete

# Be even more conservative: only delete orphans older than 3 hours
npm run media-gc -- --delete --min-age=180

# Machine-readable summary (for monitoring / piping)
npm run media-gc -- --json
```

Direct invocation without npm: `tsx scripts/media-gc.ts [flags]`.

| Flag              | Meaning                                                        |
| ----------------- | ------------------------------------------------------------- |
| `-d`, `--delete`  | Actually delete (default is a dry run)                        |
| `--min-age=<min>` | Don't delete files younger than N minutes (default 60)        |
| `--json`          | Emit a JSON summary instead of prose                          |
| `-h`, `--help`    | Show usage                                                    |

Exit codes: `0` success, `1` aborted/partial failure (e.g. DB unreadable, or a
file couldn't be unlinked), `2` bad arguments.

### Nightly cron

`media-gc` is meant to run once a day, after the database backup. Use the
wrapper [`scripts/nightly-maintenance.sh`](nightly-maintenance.sh), which runs
the backup (if present) and then the GC:

```cron
# Juncture nightly maintenance — backup, then media GC. 03:30 server time.
30 3 * * *  /opt/juncture/scripts/nightly-maintenance.sh >> /var/log/juncture-maintenance.log 2>&1
```

Set `APP_DIR` in the wrapper (or via the environment) to your deployment path.
Start with the GC in dry-run for a few nights and watch the log before enabling
`--delete` — see the comment at the top of the wrapper.
