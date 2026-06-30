#!/usr/bin/env bash
#
# Juncture backup — consistent SQLite snapshot + media mirror to BACKUP_DIR.
#
# Uses SQLite's `VACUUM INTO`, which takes a transactionally-consistent copy
# even while the app is writing (a naive `cp` of a live WAL database can be
# corrupt). Media is mirrored incrementally with rsync.
#
# Configure via env (or edit the defaults below):
#   DATA_DIR    where the app keeps vitrine.db + media   (default /opt/juncture/data)
#   BACKUP_DIR  destination, e.g. your TeraStation mount  (default /mnt/terastation/juncture)
#   KEEP_DB     how many DB snapshots to retain           (default 14)
#
# Requires: sqlite3, rsync   ->   sudo apt install -y sqlite3 rsync
set -euo pipefail

DATA_DIR="${DATA_DIR:-/opt/juncture/data}"
BACKUP_DIR="${BACKUP_DIR:-/mnt/terastation/juncture}"
KEEP_DB="${KEEP_DB:-14}"

DB="$DATA_DIR/vitrine.db"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$DB" ]; then
  echo "[backup] ERROR: database not found at $DB" >&2
  exit 1
fi
if [ ! -d "$BACKUP_DIR" ]; then
  echo "[backup] ERROR: BACKUP_DIR $BACKUP_DIR does not exist (is the NAS mounted?)" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR/db"

# 1) Consistent database snapshot.
sqlite3 "$DB" "VACUUM INTO '$BACKUP_DIR/db/vitrine-$STAMP.db'"
echo "[backup] db snapshot -> $BACKUP_DIR/db/vitrine-$STAMP.db"

# 2) Prune old snapshots, keep the newest $KEEP_DB.
ls -1t "$BACKUP_DIR/db"/vitrine-*.db 2>/dev/null | tail -n +$((KEEP_DB + 1)) | xargs -r rm -f

# 3) Mirror media (incremental; --delete keeps it an exact mirror).
if [ -d "$DATA_DIR/media" ]; then
  rsync -a --delete "$DATA_DIR/media/" "$BACKUP_DIR/media/"
  echo "[backup] media mirrored -> $BACKUP_DIR/media/"
fi

echo "[backup] done at $STAMP"
