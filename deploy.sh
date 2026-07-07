#!/usr/bin/env bash
#
# One-command deploy for the box: pull the latest, rebuild, restart, verify.
# Run from the repo directory:  ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "── pulling latest ──"
git pull --ff-only

echo "── installing deps (only changes) ──"
npm ci

echo "── building ──"
npm run build

echo "── restarting service ──"
if systemctl is-enabled --quiet juncture 2>/dev/null; then
  sudo systemctl restart juncture
  sleep 3
  systemctl --no-pager --lines=0 status juncture | head -3
else
  echo "(no systemd service named 'juncture' — start the app however you normally do)"
fi

echo "── health check ──"
PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
PORT="${PORT:-3100}"
sleep 2
if curl -sf "http://localhost:${PORT}/api/health" >/dev/null; then
  curl -s "http://localhost:${PORT}/api/health"; echo
  echo "✔ deployed and healthy"
else
  echo "✘ app is not answering on port ${PORT} — check: journalctl -u juncture -e"
  exit 1
fi
