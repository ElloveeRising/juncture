# Juncture

A private, members-only social network for **A Schell Company** — a window into a
friendship-network of artists, not a public billboard.

It *functions* like circa-2012 Facebook (one near-live chronological feed, a
composer at the top, inline likes and comments, profiles, direct messages) but
*wears a 2005 sweater* — boxy bordered cards, muted-blue chrome, Tahoma, subtle
bevels. Modern guts, nostalgic skin. Built to run on your own hardware with
near-zero upkeep.

> Working title. The app name lives in one place — `APP_NAME` in `.env` — so it
> can be renamed everywhere with a single edit.

## What makes it different

- **Contribution-wall, not paywall.** Anyone can join as a *supporter* (read,
  comment, react). Only people who've contributed real art become *creators* who
  can post — and only the admin grants that. This single rule keeps the feed
  high-signal.
- **A window, not a billboard.** Fully private; nothing loads without a logged-in
  session. Enforced server-side on every route, including media.
- **Protects the shy ones.** A creator can present a fully decoupled public
  identity (handle / display name / avatar) with nothing linking back to their
  real name or email. Uploaded images are stripped of all EXIF/GPS metadata.
- **Harassment-prevention by design.** DMs are creator↔creator by default;
  supporters can only message a creator who's opted in; blocks sever everything
  both ways.
- **Sovereign + low-upkeep.** One Next.js process, a single SQLite file, no
  third-party auth, no cloud dependency. Self-initializing, auto-migrating,
  auto-restarting, trivially backed up.

## Tech

Next.js (App Router) + TypeScript · SQLite via Drizzle (`better-sqlite3`) ·
roll-your-own argon2id sessions · sharp for image processing · Tailwind themed to
the early-2000s tokens. No Redis / Postgres / S3 / Docker required.

## Run it locally (see it the same day)

```bash
cp .env.example .env.local      # the defaults work out of the box for local dev
npm install
npm run dev                     # http://localhost:3000
```

On first boot it creates `DATA_DIR`, runs migrations, and bootstraps an admin
account from the `ADMIN_BOOTSTRAP_*` values. Sign in with those, and you're in.

## Deploy it

See **[DEPLOY.md](DEPLOY.md)** — exact steps for the NUC (Ubuntu 24.04): Node LTS,
build, a systemd service, a Cloudflare Tunnel quickstart, and nightly backups to
the TeraStation (with a tested restore procedure).

## Project layout

```
src/
  app/            routes (auth, feed, messages, admin, profiles, /media, /api)
  components/     UI in the early-2000s skin
  db/             Drizzle schema, migrations, boot-time bootstrap
  lib/            auth, sessions, media, link previews, DMs, safety, config
deploy/           systemd unit
backup.sh         consistent SQLite snapshot + media mirror
```

## Support

If Juncture is useful to you and you'd like to chip in, it directly helps Ryan —
thank you. Privacy-respecting options (Monero, on-chain Bitcoin) are especially
appreciated.

- **Buy Me a Coffee:** https://buymeacoffee.com/aSchellCompany
- **Cash App:** `$Aircityryan`
- **Bitcoin (on-chain):** `bc1q4q0u5f7ya3ylwg3h4sdq5yw7cgfpl4ghpu9uap`
- **Monero:** `4B3RLHnNS6tNeHEneTXcecTAntHknXzbLYR1yBP3yUWS9baUjdnHv4UdhjRubaSexuPGEGmJ4QKpxHdrHNjLMuZpHf15gUt`

---

Built by Ryan (A Schell Company) with Claude as a creative partner.
*Yes is meaningful only if No is possible.*
