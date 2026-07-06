# Bringing Juncture up on the box — runbook

**Who this is for:** a fresh Claude Code session running *on the dedicated Linux
box itself*, with Ryan sitting there to provide inputs and approve anything
destructive. (It also works as a plain human checklist.) This is the path we
actually chose: our own hardware, a stable free tunnel, no rented cloud. For the
"real domain via Cloudflare" variant, see `DEPLOY.md` — that's a later upgrade,
not needed to go live.

Fresh session, so you don't have the chat we came from — that's fine, everything
you need is here and in the repo. Ryan is your continuity. Read this top to
bottom, then do it, pausing where it says to.

---

## The shape of it
One always-on box runs exactly one thing: Juncture. Data lives in a single
folder. A tunnel gives it a stable public HTTPS address without opening any
router ports. Nightly backup to the internal disk. Later, a friend (Ali) becomes
a mirror by copying that one folder — never a dependency, just redundancy.

At the scale this serves — an art collective, tens of people — the hardware is
bored. SQLite + one Node process handles this without noticing. Don't over-build.

## What Ryan does BEFORE handing off to you
1. Fresh Linux installed on the box (Mint / Ubuntu / Pop — all Ubuntu-based, so
   everything below is identical).
2. Claude Code installed and signed in, this session open.
3. Repo cloned:  `git clone https://github.com/ElloveeRising/juncture.git ~/juncture`
4. The box is online (ethernet ideal) and on a UPS.

## Ground rules for you (the box session)
- **Never commit secrets.** The `.env` and the founders' real emails stay local,
  never pushed. `.gitignore` already blocks every `.env*` except `.env.example`.
- **Ryan approves anything destructive** (disk, firewall, `sudo` that changes the
  system meaningfully). Explain, then let him say go.
- Prefer boring and durable over clever. This has to run untended.

---

## Step 1 — system dependencies
```bash
# Node 20 LTS (safe even if Claude Code already brought a Node)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs git build-essential sqlite3 rsync
node --version   # expect v20.x
```

## Step 2 — install deps + build
```bash
cd ~/juncture
npm ci
npm run build          # if better-sqlite3 needs compiling, build-essential covers it
```

## Step 3 — pick the data directory (outside any cloud-sync folder)
```bash
mkdir -p ~/juncture-data
```

## Step 4 — the stable public address (Tailscale Funnel — free, no domain, no card)
Funnel gives a permanent `https://<box>.<tailnet>.ts.net` URL that survives every
reboot, and — because the tunnel dials *outward* — it keeps working over ANY
internet the box has (home router today, a phone hotspot in a blackout tomorrow),
same address throughout.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up            # prints a login link — Ryan authenticates (free account)
sudo tailscale funnel --bg 3100   # serve the app publicly in the background
tailscale funnel status      # shows the public https URL — WRITE THIS DOWN
```
If `funnel` asks you to enable it, follow the link it prints: in the Tailscale
admin console, turn on HTTPS certificates + Funnel for the tailnet (a couple of
toggles, free), then re-run. That public `…ts.net` URL is Juncture's home.

## Step 5 — configuration
Create `~/juncture/.env` (NOT committed). Generate a real secret; ask Ryan for the
three founder emails and set BASE_URL to the ts.net URL from step 4:
```bash
cd ~/juncture
cat > .env <<EOF
APP_NAME=Juncture
BASE_URL=https://REPLACE-with-the-ts.net-url-from-step-4
PORT=3100
DATA_DIR=/home/$USER/juncture-data
SESSION_SECRET=$(openssl rand -base64 48)
# First boot only — creates Ryan's admin, then remove the password line.
ADMIN_BOOTSTRAP_EMAIL=ASK-RYAN
ADMIN_BOOTSTRAP_USERNAME=ASK-RYAN
ADMIN_BOOTSTRAP_PASSWORD=ASK-RYAN
# The trio — arrive as co-equal arbiters the moment they sign up with these:
FOUNDER_EMAILS=ryan-email,jesse-email,ali-email
EOF
```
Ryan provides the real emails and a bootstrap password live; fill them in, don't
paste them into chat history you'd push anywhere.

## Step 6 — run it 24/7 (systemd)
`deploy/juncture.service` is the template. Write the real unit with this box's
user and paths, then enable it:
```bash
# Generate the unit with correct User=/WorkingDirectory=/EnvironmentFile= for THIS box,
# based on deploy/juncture.service, then:
sudo cp <the-filled-unit> /etc/systemd/system/juncture.service
sudo systemctl daemon-reload
sudo systemctl enable --now juncture
systemctl status juncture          # active (running)
journalctl -u juncture -f          # watch it boot + run migrations
```
It now starts on boot and restarts itself if it ever crashes.

## Step 7 — nightly backups (internal disk for now)
```bash
chmod +x ~/juncture/backup.sh
# nightly at 3:30am, DB snapshot + media mirror into the data dir's backups folder
( crontab -l 2>/dev/null; echo "30 3 * * * DATA_DIR=/home/$USER/juncture-data BACKUP_DIR=/home/$USER/juncture-backups /home/$USER/juncture/backup.sh >> /home/$USER/juncture-backup.log 2>&1" ) | crontab -
mkdir -p ~/juncture-backups
```
(When a friend donates a drive later, point `BACKUP_DIR` at it — one line.)

## Step 8 — go live
1. Open the `…ts.net` URL in a browser. You should hit the login wall.
2. Ryan signs up with his founder email → he's an arbiter instantly.
3. Confirm Jesse's + Ali's founder emails are in `.env` (restart the service if you
   added them after first boot: `sudo systemctl restart juncture`). When they sign
   up with those addresses, they're arbiters too — co-equal, no one promotes anyone.
4. Share the URL with the trio. (The app sends no email by design — invites are
   just "here's the link, sign up with this email.")

---

## Later, at your pace
- **Real address:** move `aschellcompany.com` DNS to Cloudflare, run a *named*
  Cloudflare tunnel → `juncture.aschellcompany.com`. See `DEPLOY.md`. Nothing else
  changes; just update `BASE_URL` and restart.
- **Ali becomes a mirror:** he clones the repo, copies the `juncture-data` folder
  from a backup, runs this same runbook, points his own tunnel at it. Failover,
  not dependency. This document is his onboarding too.

## If it won't start
- `journalctl -u juncture -e` shows the real error.
- Native module load failure → `npm rebuild better-sqlite3` in `~/juncture`.
- Forms fail after going live → `BASE_URL` must match the public URL exactly
  (that's what allow-lists the origin for server actions).
