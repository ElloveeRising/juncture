# Deploying Juncture

This puts Juncture on any always-on Ubuntu 24.04 box — your NUC, or Ali's server —
and exposes it to members over a free Cloudflare Tunnel: no port-forwarding, no
exposed home IP, and the tunnel dials *out*, so it works fine behind someone
else's router with zero changes to their network.

Everything is driven by one `.env` file, so the same build runs unchanged if it
ever moves (Ali's box → a NUC → a cloud VM). Copy-paste these blocks; the only
things you edit are in `.env` and the systemd unit.

> **If Ali is hosting:** Ali runs steps 0–4 on his machine. Step 5 (the
> Cloudflare tunnel) needs a Cloudflare account that controls the domain — that
> can be yours or Ali's; whoever owns it runs the `cloudflared tunnel login`
> step on Ali's box. Backups in step 6 point at whatever storage Ali has (or
> skip rsync and just snapshot the DB locally — better than nothing).

---

## 0. One-time: install Node LTS + tools

```bash
# Node 20 LTS from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git sqlite3 rsync
node --version   # should print v20.x
```

## 1. Get the code

```bash
sudo mkdir -p /opt/juncture && sudo chown "$USER" /opt/juncture
git clone https://github.com/ElloveeRising/juncture.git /opt/juncture
cd /opt/juncture
npm ci
```

## 2. Configure `.env`

```bash
cp .env.example .env
nano .env
```

Set, at minimum:

| Var | What to put |
|---|---|
| `APP_NAME` | `Juncture` (or rename here — it propagates everywhere) |
| `BASE_URL` | your public URL, e.g. `https://juncture.yourdomain.com` |
| `PORT` | `3100` (any free local port; the tunnel maps to it) |
| `DATA_DIR` | `/opt/juncture/data` (the DB + media live here) |
| `SESSION_SECRET` | a long random string — generate with `openssl rand -base64 48` |
| `ADMIN_BOOTSTRAP_EMAIL` / `_USERNAME` / `_PASSWORD` | the very first admin login (used once) |
| `FOUNDER_EMAILS` | comma-separated emails of the founding trio (Ryan, Jesse, Ali) — each becomes a co-equal arbiter the moment they sign up |

> **The founding trio start co-equal.** Put Ryan's, Jesse's, and Ali's real
> emails in `FOUNDER_EMAILS`. When each of them signs up (a normal account, their
> own password), they come straight in as an arbiter — nobody has to promote
> anyone. `ADMIN_BOOTSTRAP_*` just seeds the very first admin so setup has
> someone to log in as; the three founders are equal regardless of who that was.

> `BASE_URL` matters in production: it makes session cookies `Secure` and
> allow-lists your public domain for form submissions (server actions). If forms
> silently fail after going live, `BASE_URL` is the first thing to check.

## 3. Build + first run

```bash
npm run build
npm run start      # starts on $PORT; creates DATA_DIR, runs migrations,
                   # and creates your admin account on first boot
```

Visit `http://localhost:3100` on the NUC to confirm it loads, then `Ctrl-C`.

> After the first successful boot you'll see a log line telling you to remove
> `ADMIN_BOOTSTRAP_PASSWORD` from `.env`. Do that — the admin already exists and
> the bootstrap won't run again.

## 4. Run it as a service (auto-restart, start on boot)

```bash
# Edit the User / paths at the top of the unit if yours differ:
nano deploy/juncture.service

sudo cp deploy/juncture.service /etc/systemd/system/juncture.service
sudo systemctl daemon-reload
sudo systemctl enable --now juncture
sudo systemctl status juncture        # should be "active (running)"
journalctl -u juncture -f             # live logs (Ctrl-C to stop watching)
```

To deploy an update later:

```bash
cd /opt/juncture && git pull && npm ci && npm run build && sudo systemctl restart juncture
```

---

## 5. Expose to members — Cloudflare Tunnel

The tunnel runs on the NUC and dials *out* to Cloudflare, so nothing is exposed
on your home network. Cloudflare also edge-terminates HTTPS for you.

### Install cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### The steps **you** run (they need your Cloudflare account)

```bash
# 1. Log in — opens a browser to authorize your account + pick a domain.
cloudflared tunnel login

# 2. Create the tunnel (stores credentials under ~/.cloudflared/).
cloudflared tunnel create juncture

# 3. Route your hostname to the tunnel (use the same host as BASE_URL).
cloudflared tunnel route dns juncture juncture.yourdomain.com
```

### Config file

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: juncture
credentials-file: /home/ryan/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: juncture.yourdomain.com
    service: http://localhost:3100      # match PORT in .env
  - service: http_status:404
```

### Run the tunnel as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Now `https://juncture.yourdomain.com` reaches Juncture. Because Juncture is
members-only, nothing is visible without logging in.

> Keep the NUC's local port closed to the outside world — the app trusts the
> `X-Forwarded-For` Cloudflare sets for rate limiting. Only Cloudflare should
> reach it. Don't also port-forward 3100 on your router.

---

## 6. Backups (nightly, to the TeraStation)

`backup.sh` takes a consistent SQLite snapshot (`VACUUM INTO`) and mirrors the
media folder to your NAS.

```bash
chmod +x backup.sh
# test it once (adjust paths to your NAS mount):
DATA_DIR=/opt/juncture/data BACKUP_DIR=/mnt/terastation/juncture ./backup.sh
```

Nightly cron at 3:30am — `crontab -e` and add:

```cron
30 3 * * * DATA_DIR=/opt/juncture/data BACKUP_DIR=/mnt/terastation/juncture /opt/juncture/backup.sh >> /var/log/juncture-backup.log 2>&1
```

### Restore (a backup you can't restore isn't a backup)

```bash
sudo systemctl stop juncture

# 1. Restore the database (pick a snapshot).
cp /mnt/terastation/juncture/db/vitrine-YYYYMMDD-HHMMSS.db /opt/juncture/data/vitrine.db
# remove any stale WAL sidecars so SQLite reopens cleanly:
rm -f /opt/juncture/data/vitrine.db-wal /opt/juncture/data/vitrine.db-shm

# 2. Restore media.
rsync -a --delete /mnt/terastation/juncture/media/ /opt/juncture/data/media/

sudo systemctl start juncture
```

---

## Portability

Because every bit of state is under `DATA_DIR` and all config is in `.env`, moving
to a cloud VM later is: install Node, clone, `npm ci && npm run build`, copy your
`.env` (with a new `BASE_URL`), restore a backup into `DATA_DIR`, start the service.
No code changes.
