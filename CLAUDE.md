# Project rules for Claude Code

- `HANDOFF.md` is the spec. `design/screens/*.html` are the visual source of truth for the iPad Pro app (1366×1024 landscape).
- Match the design exactly: copy colours, font sizes, weights, spacing, radii, shadows and animation timings from the HTML/CSS. Do not round values, swap fonts, or "improve" the design.
- Before building a screen, open its HTML and screenshot. After building it, render it at 1366×1024 and compare with `design/screenshots/<screen>.png`; fix differences before moving on.
- Use the logo files in `design/assets/` as-is. Never redraw the MCG logo or place text next to it.
- Stack: Next.js (App Router) + TypeScript, plain CSS + CSS variables, deployed on Vercel.
- One component per reusable piece: Orb, BrandLine, Header (logo + Start over + language toggle), PrimaryButton, SecondaryButton, Chip, Card, InactivityRing, BriefChecklist.
- All copy lives in the i18n file (EN + AR). Arabic must be fully RTL using IBM Plex Sans Arabic.
- Services (speech, conversation, TTS, strategy, email) are mocked behind interfaces until told otherwise.
- Build one screen at a time and stop after each for review unless asked to continue.
