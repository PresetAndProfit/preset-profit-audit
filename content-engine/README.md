# Preset & Profit — Content Operating System

A local content OS: ingest photos from **many sources**, run **vision analysis** on each
image, generate **ready-to-post captions** in a chosen **brand voice**, run a **manual
approval** flow, schedule a **content calendar**, and **export** in several formats.
**B7Squad is the default profile and primary case study.**

The pipeline:

```
Source(s) → Normalize → Submission Queue → Vision → Caption Engine → Approval → Schedule → Post Queue → Export
```

It's **niche-agnostic**: a *brand profile* controls tone, hashtags, caption style, CTA,
engagement questions, caption length, and platform style. Runs locally, stores to a local
JSON file or **Google Sheets**. Not a SaaS dashboard.

## Setup in one command

New here? Don't hand-edit anything — run the wizard:

```bash
cd content-engine
node cli.js setup          # asks brand, IG handle, mode (local / Sheets / Instagram), API keys → writes .env
node cli.js setup-status   # shows what's connected: app, profile, AI key, Sheets, Instagram, folders
node cli.js web            # dashboard at http://localhost:4317 — the ⚙️ setup tab shows the same status
```

- **Local only** works immediately — no accounts, no keys.
- **Google Sheets** stores submissions in a shared spreadsheet (needs a sheet id + service-account key).
- **Instagram API** auto-pulls tagged posts / mentions / DMs (harder — see
  [`INSTAGRAM_SETUP.md`](INSTAGRAM_SETUP.md)). Until that's approved you can
  import any post by hand with `node cli.js intake-manual`.

## Pipeline at a glance

| Phase | What it does |
|---|---|
| **1 · Vision** | Each photo is analyzed (color, wheels, stance, body mods, roof rack, spoiler, environment, lighting, build style). Captions reference what's actually in the frame. Claude Vision when an API key is set; local pixel heuristics otherwise. |
| **2 · Intake** | Five adapters — **folder · url · tagged · mentions · dm** — all normalize into one submission queue. IG sources drain `feeds/*.jsonl` (a webhook/poller appends) or poll the Graph API when a token is set. |
| **3 · Calendar** | Approved content auto-schedules into a daily/weekly calendar with drag-and-drop reordering, mark-posted, and tracked dates. |
| **4 · Profiles** | 8 niches; adding one is a single drop-in file (auto-discovered). |
| **5 · Export** | Markdown, JSON, and CSV — including scheduled date, vision data, and the original image. |

## Brand profiles

| Profile | Niche | CTA flavor |
|---|---|---|
| `b7squad` *(default)* | Audi A4 B7 / RS4 / S4 community | "DM or tag #B7Squad to get featured" |
| `dealership` | Automotive dealership | "Book a test drive — financing available" |
| `detailing` | Auto detailing shop | "Book your detail — slots fill fast" |
| `realestate` | Real estate agent | "Schedule your private showing" |
| `restaurant` | Restaurant | "Reserve your table — link in bio" |
| `barbershop` | Barber shop | "Book your chair — walk-ins welcome" |
| `photographer` | Photographer | "Booking sessions now — DM to inquire" |
| `hvac` | HVAC company | "Free estimates — call or DM today" |

```bash
node cli.js profiles                       # list profiles + show the active one
node cli.js batch --profile restaurant     # run ANY command for a niche
# or make it the default for this install:
echo "CONTENT_PROFILE=restaurant" >> .env
```

Each profile controls **tone, hashtags, caption style, CTA, engagement questions, caption
length, and platform style**. The caption engine ([`src/captionEngine.js`](src/captionEngine.js))
is profile-agnostic — all niche knowledge is in the profile. **Adding a niche needs only one
file**: drop `profiles/<name>.js` (export-default a profile); it is auto-discovered — no
registry edit, no core changes. Easiest start: copy [`profiles/restaurant.js`](profiles/restaurant.js).

The three descriptive columns are read generically per niche
(`car_model→subject`, `color→descriptor`, `mods→details`); intake accepts
`--subject/--descriptor/--details` aliases (and sidecar keys) so non-automotive
users never touch automotive field names.

---

## Runs immediately (no setup)

With nothing configured it uses a **local JSON store** + **deterministic template
captions** — so the whole pipeline works offline and keyless. Add a Claude API key
for AI captions and Google credentials for Sheets when you're ready.

```bash
cd content-engine
node cli.js status            # shows the active storage backend + counts

# 1) Intake a pasted Instagram URL (username auto-parsed from the link)
node cli.js intake-url "https://www.instagram.com/sprint_b7/p/ABC123/" \
  --source tagged_post --car "Audi RS4 B7" --color "Sprint Blue" --mods "KW V3, 19in CH-R"

# 2) Or drop photos into inbox/ and ingest the folder
node cli.js intake-folder            # reads inbox/*.jpg|png|webp + optional <img>.json sidecars

# 3) Generate the content set for everything pending
node cli.js generate all-pending

# 4) Review + approve (approving auto-exports a ready-to-post pack)
node cli.js list --status pending
node cli.js approve <submission_id>

# 5) Or do it all visually
node cli.js web                      # http://localhost:4317

# --- Or, for a folder drop, do steps 2+3 in ONE command ---
node cli.js batch                    # ingest + caption + queue every new photo (drop order preserved)
```

> Full feature mode (AI + Sheets) needs `npm install` here for `googleapis` + `exifr`.
> The core CLI above works without it.

### Reviewing fast (keyboard shortcuts)

In the web UI the top card is auto-selected; the queue is in drop order (oldest first).
Hold the queue and fly through it:

| Key | Action |
|---|---|
| **A** | Approve selected (auto-exports a pack) |
| **R** | Reject selected |
| **P** | Mark selected as posted |
| **↑ / ↓** (or ← / →) | Move selection to prev / next submission |

Click any photo to open it full-size in a new tab.

---

## What it produces (per submission)

| Output | Notes |
|---|---|
| `generated_instagram_caption` | short, punchy, ≤220 chars, 0–2 tasteful emojis |
| `generated_story_caption` | ≤90-char overlay line |
| `generated_facebook_caption` | slightly longer, conversational |
| `generated_hashtags` | exactly **20** niche tags for the active profile |
| `generated_engagement_question` | one comment-driving question |
| `credit_block` | the profile's call-to-action / credit block |

Captions are **subject-specific and unique per submission**: the active profile reads the
submission's subject, descriptor, and details and composes from there — no two get the
same copy, and each profile's worn-out phrases are banned outright.

- Each niche's voice, hashtags, CTA, and sentence pools: [`profiles/`](profiles/)
- The profile-agnostic analysis + composition logic: [`src/captionEngine.js`](src/captionEngine.js)

With `ANTHROPIC_API_KEY` set, captions are written by Claude (guided by the active
profile's voice); without a key, the seeded template engine produces the varied copy offline.

---

## Database

One row per submission, columns (in Sheet order) defined in
[`src/schema.js`](src/schema.js):

`submission_id · source · instagram_username · media_url · local_image_path ·
caption_original · car_model · color · mods · generated_instagram_caption ·
generated_story_caption · generated_facebook_caption · generated_hashtags ·
generated_engagement_question · credit_block · approval_status · created_at`

**Approval lifecycle:** every submission starts `pending` →
`approved` (auto-generates captions if missing + drops a content pack) /
`rejected` → `posted`.

---

## Intake options

**Pasted URL** — `intake-url <url>` with optional
`--user --source tagged_post|dm --caption --car --color --mods`.
If `--user` is omitted it's parsed from the Instagram URL.

**Manual import** — `intake-manual` walks you through one post (username, source
`tagged_post`/`dm`/`manual`, caption, and a local image path *or* URL) and queues
it as pending. No Instagram API required — the simplest way to start today.

**Local folder** — drop images in `inbox/`, run `intake-folder`. EXIF metadata
(camera, dimensions, shot date, GPS) is read automatically. Add a sidecar
`<image>.json` (see [`inbox/example.json.sample`](inbox/example.json.sample)) or a
plain `<image>.txt` (caption only) to pre-fill car details. Already-ingested files
are skipped on re-run.

---

## Content packs

`approve` (or `export <id>` / `export all-approved`) writes
`exports/<submission_id>/`:

- `post.md` — copy-paste sheet (IG caption + hashtags + credit, story, Facebook)
- `post.json` — the full record
- `image.<ext>` — the photo (when a local image exists)

---

## Configuration (optional)

Run `node cli.js setup` (recommended) or copy `.env.example` → `.env` and edit by
hand. Everything is optional. Verify any time with `node cli.js setup-status`.

**AI captions** — set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`).
Uses the Claude Messages API with prompt caching on the brand brief. Without a
key, the template generator is used and the pipeline still completes.
`OPENAI_API_KEY` is accepted and stored for future use.

**Google Sheets** — set `GSHEET_CONTENT_ID`, `GSHEET_CONTENT_TAB`, and
`GOOGLE_SERVICE_ACCOUNT_JSON` (a path to a downloaded service-account key file, or
the inline JSON). Share the sheet with the key's `client_email`, then:

```bash
npm install            # installs googleapis + exifr
node cli.js setup-sheet # creates/repairs the header row
node cli.js status      # should now report storage: google-sheets
```

The local JSON store is used automatically whenever Sheets isn't fully configured.
(Legacy creds — `GOOGLE_APPLICATION_CREDENTIALS`, or `GOOGLE_CLIENT_EMAIL` +
`GOOGLE_PRIVATE_KEY` — are still honored.)

**Instagram API** — set `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID`
(and `META_APP_ID` / `META_APP_SECRET` to refresh long-lived tokens) to let the
tagged/mentions/dm adapters poll the Graph API. Full walkthrough:
[`INSTAGRAM_SETUP.md`](INSTAGRAM_SETUP.md).

---

## Command reference

```
Setup         setup                                     # wizard → writes .env
              setup-status                              # app/profile/AI/Sheets/Instagram/folders
              setup-sheet                               # create/repair the Google Sheet header

Profiles      profiles · --profile <id> (override on any command)

Intake        sources                                   # list adapters
              intake-pull [--source all|folder|url|tagged|mentions|dm] [--url ..]
              intake-url <url> [--user --car --color --mods | --subject --descriptor --details]
              intake-manual                             # guided one-post import (no API)
              intake-folder [folder]
              batch [folder]                            # ingest + vision + generate + queue

Vision        vision [id|all] [--force]                 # color, wheels, stance, lighting, environment…
Generate      generate <id|all-pending> [--force]       # vision-aware; auto-runs vision

Review        list [--status ..] · show <id> · approve/reject/posted <id> · web

Calendar      schedule [--per-day N] [--time HH:MM] [--start YYYY-MM-DD] [--reschedule]
              calendar [--days N]

Export & ops  export <id|all-approved|all> [--format md|json|csv|all]
              setup-sheet · status
```

---

## Layout

```
content-engine/
  cli.js              # command line entry
  profiles/           # one file per niche — DROP-IN, auto-discovered (Phase 4)
    index.js          # auto-discovering registry + DEFAULT_PROFILE
    _base.js          # shared helpers + makeSimpleProfile factory
    b7squad.js        # default: automotive build analyzer + vision-aware pools
    dealership.js detailing.js realestate.js restaurant.js
    barbershop.js photographer.js hvac.js
  src/
    schema.js         # columns = single source of truth (+ scheduled_date, vision_*)
    env.js            # .env loader + resolved config
    setup.js          # setup wizard, setup-status, manual import, .env writer
    util.js           # seeded RNG, monotonic clock, natural sort
    vision.js         # Phase 1: Claude Vision + local heuristics
    imageStats.js     # pure-JS PNG/JPEG decode → color/lighting stats
    intake.js         # normalize + dedupe + createSubmission (one front door)
    sources/          # Phase 2: intake adapters (folder/url/tagged/mentions/dm)
    schedule.js       # Phase 3: content calendar (auto-schedule, reorder)
    captionEngine.js  # profile-agnostic, vision-aware composition
    ai.js             # Claude generator + voice-template fallback
    contentPack.js    # Phase 5: md / json / csv export
    store.js sheets.js localStore.js image.js actions.js
  web/server.js       # approval UI + content calendar (no deps)
  feeds/              # IG intake queues (tagged_posts/mentions/dm .jsonl)
  inbox/  exports/  data/
```
