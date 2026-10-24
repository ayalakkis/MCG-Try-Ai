# Prompts to paste into Claude Code

## Message 1 — setup + shared components + screen 01

Read CLAUDE.md and HANDOFF.md fully, then open every file in design/screens, design/screenshots, design/reference and design/assets before writing any code.

Goal: build the iPad Pro version of "MCG Try AI" as a real web app that looks and behaves exactly like the design files. The design HTML is the source of truth — copy colours, font sizes, weights, spacing, radii, shadows and animation timings from it exactly. Do not redesign, round values, or swap fonts.

Stack (we will deploy on Vercel and add a real API later):
- Next.js (App Router) + TypeScript, created in this folder. Keep the design/ folder as-is.
- Plain CSS with CSS variables for the tokens in HANDOFF.md section 3 (global.css + CSS Modules per component). No Tailwind, no UI library.
- Fonts via next/font/google: Montserrat (400, 500, 600, 700) and IBM Plex Sans Arabic (400–700).
- Copy design/assets/*.png into public/brand/ and use them with next/image. Never redraw the logo or put text next to it.
- Target viewport 1366×1024 landscape, full screen; lock the app to that canvas (scale to fit if the window differs).

Architecture:
- One page (app/page.tsx) that renders the current screen from a single state machine (welcome, listening, conversation, create, preview, email, thanks) — no URL routes per screen, so nobody can navigate back into another visitor's session. Use a reducer or XState.
- All copy in one i18n file (lib/i18n.ts) with EN and AR. Language toggle sets dir="rtl" and the Arabic font.
- Services behind TypeScript interfaces in lib/services/ with mock implementations that use the sample content from the screens (Bloom Coffee, Salmiya, "The 5 PM Reset"): SpeechToText, Conversation, TextToSpeech, Strategy, Email. Create empty app/api/ folders (conversation, strategy, email, leads) with TODO route handlers so the real API can drop in later. No API keys in client code.

Shared components first (components/): Orb (props: state idle|listen|think|speak|create, size, level 0–1 — all five states from design/reference/orb-states-and-errors.html), BrandLine (the animated continuous line with pulsing pink/orange end dots), Header (logo, Start over, EN/عربي toggle), PrimaryButton, SecondaryButton, Chip, Card, SectionLabel (pink dot + uppercase), GreetingDots (orange/pink/cyan dots), InactivityRing, BriefChecklist. Respect prefers-reduced-motion.

Then build screen 01 Welcome so it matches design/screens/01-welcome.html and design/screenshots/01-welcome.png. Run the dev server, take a screenshot at 1366×1024 with Playwright, compare it side by side with the reference, fix every difference you can see, and show me both images. Then stop and wait for my review.

## Messages 2–7 — one screen each

Build screen 02 Listening to match design/screens/02-listening.html and design/screenshots/02-listening.png exactly. Wire hold-to-talk with pointer events (press = start, release = send, finger slides off = cancel) using the mocked SpeechToText, which streams the sample caption word by word and feeds mic levels into the Orb and waveform. Screenshot at 1366×1024, compare with the reference, fix, show me both, then stop.

Then the same for each of these, one message at a time:
- 03-conversation (brief checklist fills from Conversation mock; quick answers advance to the next question; AI question is spoken by the TTS mock and drives the Orb "speak" state)
- 04-create (4 stages tick off over ~36 s with the progress bar, even if the mock answers instantly; keyword chips come from the brief)
- 05-preview (content from the Strategy mock)
- 06-email (native keyboard: type="email", inputmode="email"; domain chips append to the input; inline invalid-email error; Send disabled until valid)
- 07-thanks (real QR codes generated from WhatsApp/Instagram settings; 15 s countdown then reset)

## Message 8 — full flow, timeouts, errors, Arabic

Connect all 7 screens with the state machine in HANDOFF.md section 5, including the example cards on Welcome and "Start over" everywhere (it must clear all session data). Add the inactivity timeout (60 s, 90 s on email) with the "Still there?" modal and 10 s countdown, and the error states from design/reference/orb-states-and-errors.html (mic not available, didn't catch that, reconnecting, invalid email). Make Arabic fully RTL using design/reference/rtl-arabic-*.html for copy and layout. Then use Playwright to walk the whole flow in EN and AR at 1366×1024 and show me a screenshot of every screen.

## Message 9 — ready for Vercel

Make sure `npm run build` passes with no type or lint errors, add a README with run/deploy steps, a .env.example listing the future keys (ANTHROPIC_API_KEY, speech provider key, RESEND_API_KEY, DATABASE_URL) without values, and initialise git. Don't deploy yet.
