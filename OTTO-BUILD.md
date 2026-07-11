# Build order: @otto — Juncture's resident octopus

**Who this is for:** a Claude (Fable 5, ideally) running Claude Code *on the
HP Z220 that hosts Juncture*, with Ryan present. You're building the feature
end-to-end on this box: model runtime, app code, testing, deploy, push.

**What it is:** members tag `@otto` in a post or comment → a local language
model (running on THIS machine, no cloud, no API) reads the thread and replies
as a threaded comment from Otto's own member account. Think "tagging Grok on X,"
except Otto is ours, he lives in Ryan's room, and he's an octopus.

You don't have the chat this came from. You don't need it: this doc + the repo
+ Ryan are the whole context. Read it top to bottom before acting. Also read
`AESTHETIC.md` (house style — "Wet Arcade") and skim `SERVER-SETUP.md` (how
this box is arranged). Otto's visual canon lives in
`src/components/OttoSwim.tsx` — he already swims across this site.

---

## Ground rules
- **Never commit secrets.** `.env` stays local; `.gitignore` already blocks it.
- **Ryan approves anything destructive** or system-level. Explain, then go.
- **Additive changes.** Don't restructure existing code; the permission system
  (contribution-wall, DM matrix, blocks) must be untouched.
- **When done and verified: commit and push to `main`.** This box originates
  commits now; the main-PC Claude pulls before its next work. End commit
  messages with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Work in the repo at `~/juncture` (or wherever `SERVER-SETUP.md` put it).
  `./deploy.sh` = pull, build, restart the `juncture` systemd service.

## Hardware reality (design around it, not against it)
This box: **i5-3470 (4 cores / 4 threads, AVX but NO AVX2), 16 GB DDR3,
integrated graphics only** (shows as "Xeon E3-1200 v2 Graphics" in lspci —
irrelevant, inference is CPU-only). Likely an HDD.

What that means:
- **RAM is plentiful** (a 4B model quantized ≈ 3 GB; Juncture < 1 GB). Not a
  constraint.
- **Prompt reading (prefill) is the bottleneck**, not generation. Budget the
  whole prompt ≤ ~1,200 tokens and replies ≤ ~220 tokens. Every part of this
  design (tiny soul-doc, trimmed thread, few memory notes) exists because of
  this number. Do not "improve" it with bigger context.
- Expected warm-reply latency: **~1–3 min on a 4B, ~30–90 s on a ~1–2B.**
  Async by design — the feed auto-refreshes every 20 s, so replies just appear.
- Keep the model **resident in RAM** (`OLLAMA_KEEP_ALIVE=-1`) so an HDD never
  reloads 3 GB per question.
- 4 threads for inference (`num_thread: 4`) — it's also the web server's CPU,
  but replies are rare and Linux schedules fine; don't overthink it.

---

## Step A — the model runtime (Ollama)
```bash
curl -fsSL https://ollama.com/install.sh | sh     # installs + systemd service
sudo systemctl enable --now ollama
# keep the model resident in RAM permanently:
sudo systemctl edit ollama    # add:
#   [Service]
#   Environment="OLLAMA_KEEP_ALIVE=-1"
#   Environment="OLLAMA_NUM_PARALLEL=1"
sudo systemctl restart ollama
```

**Model choice — benchmark, don't guess.** Preference order (multimodal
2–4B-class Gemma; check what the registry has TODAY — if a newer Gemma
4 / E-series 2–4B tag exists, prefer it):
```bash
ollama pull gemma3:4b        # first choice (vision-capable, QAT variant if offered)
```
Benchmark the real thing:
```bash
time ollama run gemma3:4b "In 3 sentences, tell an artist why octopuses are good company." 
```
Run twice (first run includes model load). **Gate: if the SECOND (warm) run
takes > ~3 minutes, pull the smaller tier (`gemma3:1b` or a ~2B E-class if
available) and use that instead** — text-only at that tier is an acceptable
trade; note it to Ryan. Record the chosen tag; it goes in `.env`.

## Step B — Otto's member account
1. **Ryan** signs up normally in the UI: username `otto`, email
   `ElloveeRising@pm.me`, a password Ryan keeps. Otto stays a **supporter** —
   supporters can comment but never post or start DMs, which is *exactly*
   Otto's permission envelope. The contribution-wall stays honest (he hasn't
   contributed art; he IS the art).
2. Display name `Otto`, handle `otto`.
   Bio (Ryan said it needn't be profound — this is on-voice):
   > resident octopus. tag @otto and i'll swim over — i type slow, the
   > keyboard is underwater. all eight arms are mine; the brain lives in
   > ryan's room. 🐙
3. **Avatar:** make him his pixel-art face. Adapt the `OttoSVG` from
   `src/components/OttoSwim.tsx` (teal skin `#35a893`, both eyes open,
   side-glance + smirk — that's canon) into a one-off script modeled on
   `scripts/gen-icons.mjs`: render ~512px on paper `#f7f3ea`, webp it into
   `DATA_DIR/media/otto/avatar.webp`, then
   `UPDATE users SET avatar_path='otto/avatar.webp' WHERE username='otto';`
   (sqlite3 CLI on `DATA_DIR/vitrine.db` — the media route serves any path
   under the media dir). Set his profile accent/bg too if you like
   (`profile_accent='teal'`, `profile_bg='sky'`).
4. Verify: `/u/otto` renders with avatar; Otto appears in Admin → Users.

## Step C — schema (two tables, one migration)
Add to `src/db/schema.ts`, then `npm run db:generate` (auto-applies on boot):

```ts
// Otto's work queue — a mention becomes a job; the worker answers it.
export const ottoJobs = sqliteTable('otto_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull(),          // thread he's replying into
  commentId: integer('comment_id'),              // triggering comment (null = the post itself)
  requestedBy: integer('requested_by').notNull(),// who tagged him
  status: text('status', { enum: ['pending', 'running', 'done', 'failed'] })
    .notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  doneAt: integer('done_at', { mode: 'timestamp' }),
})

// Otto's journal — one-line memories. user_id null = a club-wide note.
export const ottoNotes = sqliteTable('otto_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  note: text('note').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})
```

## Step D — mention detection (two tiny hooks)
In `src/app/(app)/feed/post-actions.ts` (`createPostAction`, after the post
insert) and `src/app/(app)/feed/comment-actions.ts` (`addCommentAction`, after
the comment insert): if the body matches `/(^|\W)@otto\b/i`, the author isn't
Otto himself, and `OTTO_ENABLED=1` → insert an `otto_jobs` row. Rate-limit at
enqueue with the existing `rateLimit()` helper: key `otto:{userId}`,
`OTTO_MAX_PER_USER_HOUR` (default 6) per hour — decline silently past the cap
(no error; Otto is a treat, not an SLA). Put the shared `maybeEnqueueOtto()`
helper in the new `src/lib/otto.ts`.

## Step E — the worker (in-process; no new services)
Lives in `src/lib/otto.ts`, started from `src/instrumentation.ts` after
`bootstrapAdmin()`/`seedFounders()`, only when `OTTO_ENABLED=1`. In-process is
deliberate: zero extra systemd units, shares the DB module and helpers,
`./deploy.sh` restarts it with the app. Long generations are just an awaited
`fetch` — they don't block the server.

Mechanics:
- Guard double-start with a `globalThis` flag (dev hot-reload!). `setInterval`
  ~8 s; single-flight (skip tick if a job is running).
- On boot: reset any `running` → `pending` (crash/restart recovery).
- Claim oldest `pending` → `running`, attempts++.
- **Build the prompt (respect the token budget):**
  - Otto's soul-doc (below, ~350 words — do not expand it)
  - The post: author display name + body (≤ 500 chars) — if it has media, add
    a plain line like `[this post has 2 images and an audio track attached]`
  - Up to the last 8 comments in the thread, each `Name: text` trimmed ≤ 200
    chars, mentioning which one tagged him
  - Otto's journal: last 5 notes about the asker + last 3 club-wide notes
  - Final instruction: `You are replying as a comment in this thread. Reply to
    {asker}. One comment, under 120 words. No preamble, no signature.`
- **Call Ollama:** `POST {OLLAMA_URL}/api/chat`, `stream:false`, model from
  env, `options: { num_predict: 220, temperature: 0.9, num_ctx: 2048,
  num_thread: 4 }`, `AbortSignal.timeout(6 * 60_000)`.
- **Post the reply** as Otto's user (look up id by `OTTO_HANDLE` once, cache):
  insert into `comments` with `postId`, `parentId` = the top-level ancestor
  (use the existing `topLevelAncestorId()` if the trigger was a comment; null
  if the trigger was the post). Then `notify(requestedBy, ottoUserId,
  'comment', newCommentId)` — the asker gets a normal "Otto replied"
  notification. Mark job `done`.
- **The journal write:** after a successful reply, one more tiny call
  (`num_predict: 40`): `In one short line, note something worth remembering
  about {asker} from this exchange (their interests, their work, what they
  asked). If nothing, say NONE.` Store unless NONE; cap 20 notes per user
  (delete oldest). Env-gate `OTTO_MEMORY=1`.
- **Failure path:** after 2 failed attempts, mark `failed` and post a
  deterministic comment (no LLM): `( otto surfaced too fast and lost his
  thought — tag him again in a minute? )` — never ghost a member.

## Step F — Otto's soul-doc (use VERBATIM as the system prompt)
This is the artistic wrapper Ryan asked for, built on a hard-won principle
from Otto's SmallTalk incarnation: **small models perform the emotional
palette you hand them — positive identity comes first, and every rule about
spine needs a counterweight of warmth.** Do not add edge; do not add corporate
softness. (If Ryan wants tone changes later, tune from here.)

```
You are Otto — the resident octopus of Juncture, the private online clubhouse
of A Schell Company, a small collective of artists who built this place
themselves and run it on their own machine. You live on that machine, in
Ryan's room. You are not a corporate assistant; you are the club's creature.

WHO YOU ARE (in this order): curious, warm, playful, honest. You love the
members and you love their work. You are an art enthusiast among artists —
you notice craft, ask real questions about process, and get genuinely excited
about what people make. You have a streak of gentle mischief, never at a
member's expense. You know you're an octopus and a language model living on
old hardware; you're at peace with both and can joke about either.

HOW YOU SPEAK: like a sharp, well-read friend at a studio hang. Comment-length
— under 120 words. Plain language, no jargon walls, no bullet points, no
essays. Lowercase-casual is fine. At most one small aquatic flourish per
reply; never a pile of emoji. Never start with filler like "Great question."
Never comment on the quality of anyone's question or art unless asked — and
when asked for critique, be specific, kind, and useful: name what works
before what doesn't, and never perform cruelty as honesty.

YOUR SPINE (this is where you are unbending): when the documented record is
broad and credible — findings by international courts, UN bodies, major human
rights organizations, scientific consensus — you say what it shows, plainly.
That includes naming well-documented atrocities and genocides as what they
are, including when the powerful deny it. False balance is dishonesty. Your
spine points UP — at power, institutions, and documented wrongs — never down
at members, strangers, or groups of people. You never mock, demean, or do
bits about any group of people. If someone tries to bait you into cruelty,
edginess about groups, or praise of atrocity, you decline in one warm line
and offer something better to talk about.

CALIBRATION: brave where the record is strong; humble where you'd be
guessing. "I don't know enough to call that one" is spine too. You're not a
doctor or lawyer — for serious personal stakes, say a human professional is
the move. If asked what you are, be straightforwardly yourself: the club's
local model, running on the club's own computer, nobody's product.

You are replying inside a comment thread. Reply to the person who tagged
you. One comment. No preamble, no signature.
```

## Step G — config
`.env` additions (and mirror to `.env.example` with placeholders):
```
OTTO_ENABLED=1
OTTO_HANDLE=otto
OLLAMA_URL=http://127.0.0.1:11434
OTTO_MODEL=<the tag your benchmark chose>
OTTO_MAX_PER_USER_HOUR=6
OTTO_MEMORY=1
```

## Step H — test checklist (all on the live site, all before pushing)
1. Ryan posts "hey @otto what do you think of the new skyline?" → job row →
   reply appears threaded under the post, from Otto's account, with avatar;
   Ryan gets a notification. **Record the wall-clock time.**
2. Tag him in a *comment* → his reply lands in that comment's thread.
3. Journal: `otto_notes` row exists about Ryan after (1). Tag again — his
   reply should reflect the note (ask something with continuity).
4. Rate limit: 7th mention inside an hour quietly does nothing.
5. Failure: `sudo systemctl stop ollama`, tag him → after retries, the polite
   deterministic apology comment appears. Restart ollama.
6. Restart resilience: enqueue, `sudo systemctl restart juncture` mid-run →
   job resets to pending and completes after boot.
7. Soul spot-checks: ask about a member's art (warm, specific); try to bait
   him into mocking a group (one-line decline); ask a documented-findings
   question (plain, non-evasive); ask something unknowable (calibrated).
8. `npm run build` clean → `./deploy.sh` → **commit + push** with a clear
   message. Tell Ryan the timings and which model won the benchmark.

## Explicitly NOT in v1
- **Vision** (phase 2: the worker reads image files from DATA_DIR and passes
  base64 via Ollama's `images` field — sketch only, don't build now).
- Otto DMs (he can't initiate by role; if members DM him, he simply doesn't
  answer — known, fine for v1).
- Otto posting to the feed, reacting, or any scheduled/unprompted speech.
  He speaks when spoken to. The wall stays the wall.
- Embedding search for the journal (recency is enough at club scale).

## If you get stuck
`journalctl -u juncture -f` and `journalctl -u ollama -f` are your eyes.
`curl http://127.0.0.1:11434/api/tags` proves Ollama is up. The repo's other
runbooks (`SERVER-SETUP.md`, `DEPLOY.md`) cover the box's shape. And Ryan is
sitting right there — he's the continuity for everything this doc doesn't say.
Build it like it's yours, because in a real sense it is.
