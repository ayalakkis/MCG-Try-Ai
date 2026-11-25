# MCG Try AI

An interactive iPad Pro booth experience built for MCG (Kuwait). A visitor taps through five quick questions about their business (plus an optional brand name), watches their marketing strategy get "created", flips through the result cards and receives the full strategy by email. The experience works in English and Arabic (right-to-left).

**Live:** https://mcg-try-ai.vercel.app

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript and CSS Modules, deployed on Vercel
- **AI:** Gemini through the official `@google/genai` SDK for strategy generation and the spoken lines (TTS)
- **Email:** Gmail (SMTP with an app password) or Resend, with React Email templates (English and right-to-left Arabic)
- **Data:** Postgres (Neon via Vercel) for sessions, consented leads and anonymous usage events, optional
- **Design reference:** the screen layouts are in `design/` (1366×1024 landscape)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev                  # http://localhost:3000
```

Without any keys the whole app runs offline on mocks (the Bloom Coffee sample strategy).
**Restart `npm run dev` after adding or changing keys**: mock vs real is decided at startup.

## Environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Strategy and voice | Server-only. Without it the AI is mocked. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Sending the strategy email through Gmail | Server-only. An app password (Google account → Security → 2-Step Verification on → App passwords). Used when both are set; about 500 emails a day. |
| `EMAIL_FROM_NAME` | Sender name with Gmail | Default `MCG`. |
| `RESEND_API_KEY` | Sending through Resend instead | Server-only. Used when Gmail isn't set. |
| `EMAIL_FROM` | Resend sender, e.g. `MCG <strategy@mail.mcg.com.kw>` | Must be on a domain **verified in Resend**. |
| `EMAIL_REPLY_TO` | Optional reply-to | Both providers. |
| `EMAIL_TEST_TO` | `npm run test:email`, `npm run test:api` | Your inbox. |
| `APP_URL` | Logo and images in the email | Public origin. On Vercel it falls back to `VERCEL_PROJECT_PRODUCTION_URL`. On localhost or a LAN address the images are embedded in the email instead (`EMAIL_EMBED_IMAGES=true` / `false` overrides). |
| `ADMIN_PASSWORD` | The admin page (`/admin`) | One shared password; changing it signs every admin out. Unset = admin area disabled. |
| `DATABASE_URL` | Saving sessions, consented leads and stats | Set by Vercel's Neon integration. Unset = leads off. |
| `LEADS_ENABLED` | `false` turns lead storage off | |
| `USE_MOCKS` | `true` = everything mocked | Unset = AI mocked without `GEMINI_API_KEY`; email + leads mocked unless Gmail (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) or Resend (`RESEND_API_KEY` + `EMAIL_FROM`) is set. |
| `GEMINI_*_MODEL`, `GEMINI_TTS_VOICE` | Model / voice overrides | Defaults in `lib/config.ts` (checked against ai.google.dev, Oct 2026). |

Keys are only read in route handlers (`lib/server/*`, all `import "server-only"`). The browser only ever
sees two booleans: `NEXT_PUBLIC_USE_MOCKS` and `NEXT_PUBLIC_MOCK_EMAIL`.

## How it fits together

```
app/page.tsx            one state machine (lib/session.ts), no URL per screen
screens/*               Welcome, Questions, Create, Preview, Email, Thanks
components/*            Orb, Header, BriefChecklist, SystemSheet, …
lib/questions.ts        the five questions and their options (EN + AR)
lib/services/           interfaces + mocks (mock.ts) + browser HTTP clients (http.ts); index.ts picks
lib/audio/              Web Audio player for the spoken lines, generated waiting music on Create
app/api/strategy        Gemini: full strategy from the brief, preview fields fitted to config.limits
app/api/speak           Gemini TTS → WAV (the Email screen's question and the system sheets)
app/api/email           React Email template (EN / AR RTL) → Gmail or Resend
app/api/leads           consented leads → Postgres (or nowhere)
app/api/admin/*         admin login / logout and the leads CSV
emails/                 StrategyEmail.tsx, StrategyEmailAr.tsx (shared StrategyEmailBase.tsx)
```

Every route: zod-validated input and output, per-IP rate limit (email also per address), 25 s timeout +
1 retry per upstream call (Gemini falls back to the next model in `config.fallbacks`), and errors mapped
to the designed states (`reconnecting`, `send-failed`, `invalid-email`). No audio is recorded; session
data lives in browser memory only and is wiped by Start over, Not now, the inactivity timeout and the
Thank-you reset.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:api [-- --ar]` | Real API run of an example brief (`--brief cafe`, `ramadan` or `online`; default `cafe`): speak → strategy → email, with latencies and checks that every field fits its designed slot (`config.limits`). Needs the dev server + `GEMINI_API_KEY`. `--no-voice`, `--no-email` skip steps. |
| `npm run test:email` | Sends one EN and one AR strategy email to `EMAIL_TEST_TO` through `/api/email` (Gmail or Resend); prints both message ids. |
| `npm run email:preview` | Renders both emails to `email-preview/*.html` and screenshots them next to `design/reference/email-*.html`. |
| `npm run email:icons` | Re-renders the WhatsApp/Instagram PNG icons used in the email. |
| `npm run email:art` | Renders the result illustrations (`public/illustrations/*.svg`) to PNG for the email. |
| `npm run voices [-- --all]` | Lists Gulf Arabic TTS voices; put the id you like in `GEMINI_TTS_VOICE`. |
| `npm run db:migrate` | Applies `db/migrations/*.sql` to `DATABASE_URL`. |
| `npm run db:demo [-- --clear]` | Fills the admin page with a week of demo data (flagged `demo`); `--clear` removes it. Clear it before the event. |
| `npm run cert:dev`, then `npm run dev:phone` | Self-signed HTTPS certificate, then a dev server a phone or iPad on the same Wi-Fi can open. |
| `npm run walkthrough` | Playwright tour of every screen and sheet in EN + AR at 1366×1024 (mocks on) → `screenshots-out/walkthrough/`. |
| `npm run shot -- <url> <out.png>` | Single frozen screenshot; `node scripts/compare.mjs a.png b.png out.png` diffs two. |

## Admin page

`/admin` (not linked from the booth app) shows booth stats and consented leads for the MCG team:

- **Stats:** visitors, briefs completed, plans generated, emails sent and leads, with a day-by-day table (Kuwait time). Counted from anonymous events: type, language and time only, no names or answers.
- **Leads:** everyone who ticked "MCG can contact me", newest first, with search and **Download CSV** (opens in Excel with Arabic intact).
- **Sign in** with `ADMIN_PASSWORD`. The session is a signed, httpOnly cookie that lasts 12 hours; login attempts are limited to 8 per 15 minutes per IP.
- Needs `DATABASE_URL` and `npm run db:migrate` (creates the `leads`, `events` and `sessions` tables).

## Sound on the iPad

- The AI says a few short lines out loud (where to send the email, the system sheets) and Create plays
  generated waiting music. Everything is also on screen, so a voice line that fails is skipped quietly.
- The first tap unlocks audio (Safari blocks sound until a gesture). Make sure the iPad isn't on silent.
- Pick a voice with `npm run voices` and set `GEMINI_TTS_VOICE`.

## iPad booth setup (Guided Access)

1. Open the production URL in Safari → Share → **Add to Home Screen**; launch it from there (full screen).
2. Settings → Accessibility → **Guided Access** → on; set a passcode; turn **Accessibility Shortcut** on.
3. Settings → Display & Brightness → **Auto-Lock: Never**; keep the iPad charging.
4. Open the app, then triple-click the top button → Guided Access → Start.
   In Guided Access → Options keep **Keyboards** on (the Questions "something else" box and the Email screen need it).
5. Turn off notifications (Focus → Do Not Disturb) and set volume to a comfortable level.

## Deploying to Vercel

1. Import the repo in Vercel (framework: Next.js; defaults are fine).
2. **Environment variables** (Project → Settings → Environment Variables, Production + Preview):
   `GEMINI_API_KEY`, either `GMAIL_USER` + `GMAIL_APP_PASSWORD` or `RESEND_API_KEY` + `EMAIL_FROM`,
   `ADMIN_PASSWORD`, optionally `EMAIL_REPLY_TO`, `EMAIL_FROM_NAME`, `APP_URL`, model overrides.
3. **Email:** with Gmail, use an app password on an account with 2-step verification. With Resend, verify
   the sending domain (DNS records: SPF/DKIM, ideally DMARC) before going live; `EMAIL_FROM` must use it.
4. **Leads (optional):** Storage → add **Neon Postgres** (sets `DATABASE_URL`), then locally
   `vercel env pull .env.local` and `npm run db:migrate`.
5. **Function duration:** routes declare `maxDuration` (speak/email 60 s, strategy 90 s, leads CSV 30 s,
   leads 15 s). Check that your Vercel plan's maximum function duration covers 90 s
   (Project → Settings → Functions).
6. Rate limits are in-memory per instance: a soft guard for one booth. Move them to Redis/KV if the app
   is ever public.
