#!/usr/bin/env bash
#
# nightly-maintenance.sh — run from cron once a day on the Juncture host.
#
# Order matters: back up the database FIRST, then garbage-collect orphaned
# media. That way a GC bug can never destroy data that wasn't already backed up.
#
# Crontab example (03:30 server time):
#   30 3 * * *  /opt/juncture/scripts/nightly-maintenance.sh >> /var/log/juncture-maintenance.log 2>&1
#
# First few nights: leave GC_DELETE unset (or "0") so the GC runs in dry-run and
# only logs what it WOULD remove. Once the log looks right, set GC_DELETE=1.
#
set -euo pipefail

# Where the app is checked out. Defaults to the parent of this script's dir, so
# it works whether the script is symlinked into cron or run in place. Override
# by exporting APP_DIR in the crontab / environment.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Set GC_DELETE=1 to actually delete orphans; anything else = dry run.
GC_DELETE="${GC_DELETE:-0}"
# Don't delete media younger than this many minutes (passed to media-gc).
GC_MIN_AGE_MINS="${GC_MIN_AGE_MINS:-60}"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*"; }

cd "$APP_DIR"

log "nightly-maintenance starting in $APP_DIR"

# 1) Database backup. backup.sh isn't part of the repo yet; run it if/when it
#    lands so the two stay wired together. Until then this is a no-op + notice.
if [ -x "$APP_DIR/scripts/backup.sh" ]; then
  log "running backup.sh"
  "$APP_DIR/scripts/backup.sh"
else
  log "no scripts/backup.sh found — skipping backup step (add one and it runs automatically)"
fi

# 2) Orphaned-media garbage collection.
GC_ARGS=("--min-age=${GC_MIN_AGE_MINS}")
if [ "$GC_DELETE" = "1" ]; then
  GC_ARGS+=("--delete")
  log "running media-gc (DELETE, min-age=${GC_MIN_AGE_MINS}m)"
else
  log "running media-gc (dry-run, min-age=${GC_MIN_AGE_MINS}m) — set GC_DELETE=1 to enable deletion"
fi
npm run --silent media-gc -- "${GC_ARGS[@]}"

log "nightly-maintenance done"
