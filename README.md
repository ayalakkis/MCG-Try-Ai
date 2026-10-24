# MCG Try AI

The iPad Pro booth experience for MCG (Kuwait). A visitor talks to the AI, answers a few questions, watches
their campaign get "created", sees a short preview and gets the full strategy by email.

- **Spec:** `HANDOFF.md`. **Visual source of truth:** `design/screens/*.html` (1366×1024 landscape).
- **Stack:** Next.js 16 (App Router) + TypeScript, plain CSS Modules, deployed on Vercel.
- **AI:** Gemini via the official `@google/genai` SDK: conversation, strategy, transcription and voice (TTS).
- **Email:** Resend + React Email. **Leads:** Postgres (Neon via Vercel), optional.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev                  # http://localhost:3000
```

Without any keys the whole app runs offline on mocks (Bloom Coffee / "The 5 PM Reset").
**Restart `npm run dev` after adding or changing keys**: mock vs real is decided at startup.

## Environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Conversation, strategy, transcription, voice | Server-only. Without it the AI is mocked. |
| `RESEND_API_KEY` | Sending the strategy email | Server-only. |
| `EMAIL_FROM` | Sender, e.g. `MCG <strategy@mail.mcg.com.kw>` | Must be on a domain **verified in Resend**. |
| `EMAIL_REPLY_TO` | Optional reply-to | |
| `EMAIL_TEST_TO` | `npm run test:email`, `npm run test:api` | Your inbox. |
| `APP_URL` | Logo and icons in the email | Public origin. On Vercel it falls back to `VERCEL_PROJECT_PRODUCTION_URL`. Localhost images don't load in mail clients. |
| `ADMIN_PASSWORD` | The admin page (`/admin`) | One shared password; changing it signs every admin out. Unset = admin area disabled. |
| `DATABASE_URL` | Saving consented leads | Set by Vercel's Neon integration. Unset = leads off. |
| `LEADS_ENABLED` | `false` turns lead storage off | |
| `USE_MOCKS` | `true` = everything mocked | Unset = AI mocked without `GEMINI_API_KEY`; email + leads mocked without `RESEND_API_KEY`/`EMAIL_FROM`. |
| `GEMINI_*_MODEL`, `GEMINI_TTS_VOICE` | Model / voice overrides | Defaults in `lib/config.ts` (checked against ai.google.dev, Oct 2026). |

Keys are only read in route handlers (`lib/server/*`, all `import "server-only"`). The browser only ever
sees two booleans: `NEXT_PUBLIC_USE_MOCKS` and `NEXT_PUBLIC_MOCK_EMAIL`.

## How it fits together

```
app/page.tsx            one state machine (lib/session.ts), no URL per screen
screens/*               the 7 designed screens        components/*  Orb, Header, SystemSheet, …
lib/services/           interfaces + mocks (mock.ts) + browser HTTP clients (http.ts); index.ts picks
lib/audio/              recorder (MediaRecorder + AnalyserNode), player (Web Audio), live captions
app/api/conversation    Gemini Flash: next question, 4 quick answers, brief updates (EN + Kuwaiti AR)
app/api/strategy        Gemini Pro: full strategy, preview fields fitted to config.limits
app/api/transcribe      Gemini Flash audio understanding (Kuwaiti/Gulf Arabic, English or mixed)
app/api/speak           Gemini 3.8 TTS → WAV
app/api/email           React Email template (EN / AR RTL) → Resend
app/api/leads           consented leads → Postgres (or nowhere)
emails/                 StrategyEmail.tsx, StrategyEmailAr.tsx (shared StrategyEmailBase.tsx)
```

Every route: zod-validated input and output, per-IP rate limit (email also per address), 25 s timeout +
1 retry per upstream call, and errors mapped to the designed states (`reconnecting`, `mic`, `missed`,
`invalid-email`). Audio is never stored; session data lives in browser memory only and is wiped by
Start over, Not now, the inactivity timeout and the Thank-you reset.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript 7) |
| `npm run test:api [-- --ar]` | Real API run of the Bloom Coffee brief: speak → transcribe → conversation → strategy → email, with latencies and slot-length checks. Needs the dev server + `GEMINI_API_KEY`. `--no-voice`, `--no-email` skip steps. |
| `npm run test:email` | Sends one EN and one AR strategy email to `EMAIL_TEST_TO` through `/api/email`; prints both Resend ids. |
| `npm run email:preview` | Renders both emails to `email-preview/*.html` and screenshots them next to `design/reference/email-*.html`. |
| `npm run email:icons` | Re-renders the WhatsApp/Instagram PNG icons used in the email. |
| `npm run voices [-- --all]` | Lists Gulf Arabic TTS voices; put the id you like in `GEMINI_TTS_VOICE`. |
| `npm run db:migrate` | Applies `db/migrations/*.sql` to `DATABASE_URL`. |
| `npm run walkthrough` | Playwright tour of every screen and sheet in EN + AR at 1366×1024 (mocks on) → `screenshots-out/walkthrough/`. |
| `npm run shot -- <url> <out.png>` | Single frozen screenshot; `node scripts/compare.mjs a.png b.png out.png` diffs two. |

TypeScript note: `typescript` is aliased to `@typescript/typescript6` because typescript-eslint needs the
TS 6 API; `tsc` itself is TypeScript 7 (`@typescript/native`), as Microsoft recommends for TS 7.0.

## Admin page

`/admin` (not linked from the booth app) shows booth stats and consented leads for the MCG team:

- **Stats:** visitors, briefs completed, plans generated, emails sent and leads, with a day-by-day table (Kuwait time). Counted from anonymous events: type, language and time only, no names or answers.
- **Leads:** everyone who ticked "MCG can contact me", newest first, with search and **Download CSV** (opens in Excel with Arabic intact).
- **Sign in** with `ADMIN_PASSWORD`. The session is a signed, httpOnly cookie that lasts 12 hours; login attempts are limited to 8 per 15 minutes per IP.
- Needs `DATABASE_URL` and `npm run db:migrate` (creates the `leads` and `events` tables).

## Voice on the iPad

- The mic only works on **HTTPS** (or localhost). Test on the iPad with the **Vercel preview URL**, not
  `http://<your-laptop-ip>:3000`.
- Open `/voice-lab` (hidden, not linked): hold to record → transcript; type text → hear it; shows the
  latency of every step, the recording format (iPad Safari records `audio/mp4`, sent to Gemini as
  `audio/m4a`) and whether the page is a secure context.
- The first tap unlocks audio (Safari blocks sound until a gesture). Make sure the iPad isn't on silent.
- Allow the microphone when Safari asks. If it was denied: Settings → Apps → Safari → Microphone → Allow
  (or aA → Website Settings → Microphone).
- Live captions use the browser's SpeechRecognition where it can run next to the recorder; on iPad it is
  off by default (`config.voice.liveCaptions = "auto"`) because Safari shares one mic between them. Try
  "on" in `/voice-lab`; otherwise the waveform shows, then the final text.

## iPad booth setup (Guided Access)

1. Open the production URL in Safari → Share → **Add to Home Screen**; launch it from there (full screen).
2. Settings → Accessibility → **Guided Access** → on; set a passcode; turn **Accessibility Shortcut** on.
3. Settings → Display & Brightness → **Auto-Lock: Never**; keep the iPad charging.
4. Open the app, allow the microphone once, then triple-click the top button → Guided Access → Start.
   In Guided Access → Options keep **Keyboards** on (the Email screen needs it).
5. Turn off notifications (Focus → Do Not Disturb) and set volume to a comfortable level.

## Deploying to Vercel

1. Import the repo in Vercel (framework: Next.js; defaults are fine).
2. **Environment variables** (Project → Settings → Environment Variables, Production + Preview):
   `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, optionally `EMAIL_REPLY_TO`, `APP_URL`, model overrides.
3. **Resend:** verify the sending domain (DNS records: SPF/DKIM, ideally DMARC) before going live;
   `EMAIL_FROM` must use it.
4. **Leads (optional):** Storage → add **Neon Postgres** (sets `DATABASE_URL`), then locally
   `vercel env pull .env.local` and `npm run db:migrate`.
5. **Function duration:** routes declare `maxDuration` (conversation/transcribe/speak/email 60 s, strategy
   90 s, leads 15 s). Check that your Vercel plan's maximum function duration covers 90 s
   (Project → Settings → Functions).
6. Request bodies are capped at 4.5 MB on Vercel; recordings are capped at 4 MB (`config.voice`).
7. Rate limits are in-memory per instance: a soft guard for one booth. Move them to Redis/KV if the app
   is ever public.

## Still to confirm with MCG (marked `TODO(MCG)` in code)

- Real WhatsApp/Instagram links, privacy URL and event name (`lib/config.ts`).
- Whether "MCG can contact me" may be pre-ticked (legal); privacy note copy (`lib/i18n.ts`).
- The TTS voice for Kuwaiti Arabic (`npm run voices`, then `GEMINI_TTS_VOICE`).
