# MCG Try AI — iPad Pro front-end handoff

An interactive AI marketing-strategy experience for MCG's booth (Kuwait, November).
A visitor talks to the AI, it asks a few follow-up questions, "creates" a campaign
in front of them, shows a short preview, and emails the full strategy.

This kit is the **source of truth** for the iPad Pro version. Build it so it looks
and behaves exactly like the files in `design/`.

---

## 1. What's in this kit

| Path | What it is |
|---|---|
| `design/screens/01-welcome.html` … `07-thanks.html` | The 7 iPad screens as static HTML/CSS. **Exact sizes, colours, spacing, fonts and animations live here.** Open them in Chrome at 1366×1024. |
| `design/screenshots/*.png` | Pixel reference of each screen (rendered at 1.5×). Use for visual comparison. |
| `design/assets/` | Official MCG logos cut from the brand guidelines. `mcg-mark-color.png` is used in the app header. Do not redraw, recolour or put text next to the logo. |
| `design/reference/rtl-arabic-*.html` | Arabic (right-to-left) versions of three screens from the kiosk design. Use them for Arabic copy, RTL layout rules and the Arabic font. |
| `design/reference/orb-states-and-errors.html` | The five orb states and all error / timeout pop-ups (copy + layout). |
| `design/reference/email-en.html`, `email-ar.html` | The strategy email (not part of the iPad app; for the back end later). |

The HTML is static: values are hard-coded sample data. Your job is to turn it into a
real app with state, components and data — **without changing the look.**

---

## 2. Device & layout

- Target: **iPad Pro 12.9" landscape, 1366×1024 CSS px**, Safari / installed PWA, full screen (Guided Access at the booth).
- Every screen = dark-blue stage (`#144074` + three blurred glow blobs) with a white rounded panel inset 20 px, radius 40 px, padding 28/48/36 px.
- Header (64 px): logo left (44 px tall); right: **Start over** button (hidden on Welcome & Thank you) + **EN / عربي** toggle.
- Body: two-column CSS grid (orb/visual on one side, content on the other). Column ratios differ per screen — copy them from the HTML.
- Footer: small inactivity ring + seconds (e.g. "60s") bottom-right; Welcome shows the tagline instead.
- Minimum touch target 44 px (most buttons are 68–88 px tall).

## 3. Design tokens (copy exactly)

```
--blue-dark:   #144074   (stage background, primary buttons, headings/text)
--blue:        #125D99   (accent text, labels)
--cyan:        #2694CF   (gradients, highlights, waveform)
--blue-light:  #8CC4E8   (timeline week 4)
--tint:        #E8F2FB   (chips, icon tiles)
--surface-2:   #F7FAFD / #F1F6FB (soft panels)
--border:      #E3EAF2   (cards)  #D9E2EC (secondary buttons, inputs)
--text-muted:  #4E5F78   --text-faint: #8796AB
--brand-orange:#EF8E0A   --brand-pink: #E5418C   --brand-cyan-dot: #1EA5E0
Greeting gradient: linear-gradient(90deg, #2694CF, #125D99) clipped to text
Card shadow: 0 1px 2px rgba(16,42,80,.04), 0 8px 24px rgba(16,42,80,.06)
Radii: panel 40, cards 24–28, pills 999
```

Fonts (Google Fonts): **Montserrat** 400/500/600/700 (Bold = headlines, Medium = sublines) — brand typeface.
Arabic: **IBM Plex Sans Arabic** 400–700.

Brand signatures (from MCG guidelines) used across screens:
- **Three dots** (orange, pink, cyan) after greetings: "Hello…", "Your campaign…", "Watch us create…".
- **Pink dot** before small uppercase section labels ("• EXAMPLES", "• YOUR BRIEF").
- **Continuous line** with a pink dot at one end and an orange dot at the other, flowing behind the orb (Welcome, Thank you). It animates: the path morphs to a mirrored wave and back every 7 s; the dots pulse every 2.4 s.

## 4. The orb (the AI's only visual identity)

Build it as one reusable component: `<Orb state="idle|listen|think|speak|create" size={px} level={0..1} />`.
Layers (all in the HTML `.orb` CSS): glow `.g`, core sphere `.c`, two counter-rotating conic swirls `.s` / `.s2`, highlight `.h`, plus extras per state.

| State | When | Motion |
|---|---|---|
| idle | Welcome, Thank you | breathe scale 1→1.045 over 5.5 s, glow pulses |
| listen | while button held | scale follows **live mic level** (map RMS to 1–1.14); 3 rings ripple out |
| think | between turns (<2 s) | swirls speed up (3 s/turn), saturation pulse |
| speak | AI voice playing | pulse driven by **TTS audio envelope** |
| create | strategy generation | fast swirls, dashed orbit rings, orange/pink/cyan particles orbiting |

The HTML uses fixed keyframes as stand-ins; in the app drive listen/speak scale from real audio levels (Web Audio `AnalyserNode`).
Respect `prefers-reduced-motion` (fall back to gentle idle).

## 5. Flow & state machine

```
WELCOME ──hold "Hold to talk"──▶ LISTENING ──release──▶ CONVERSATION
   ▲   └─tap an example─────────────────────────────────▶ CREATE (uses canned brief)
   │                                  CONVERSATION ──hold "Hold to answer"──▶ LISTENING ──release──▶ CONVERSATION (next question)
   │                                  CONVERSATION ──tap a quick answer──▶ CONVERSATION (next question)
   │                                  CONVERSATION ──all 6 brief fields filled──▶ CREATE
   │   CREATE (30–40 s, 4 stages tick off, progress bar) ──▶ PREVIEW
   │   PREVIEW ──"Email me the full plan"──▶ EMAIL      PREVIEW ──"Not now"──▶ WELCOME
   │   EMAIL ──"Send" (valid email)──▶ THANK YOU
   └── THANK YOU (auto reset after 15 s, or "Start over")
Any screen: "Start over" ▶ WELCOME (clears all session data)
```

Implement as a single-page app with one `screen` state (not URL routes), so the
booth device can't navigate "back" into someone else's session.

### Brief fields (collected during CONVERSATION)
`business`, `goal`, `audience`, `location`, `budget`, `timing` — shown as the 6-row
checklist on screen 03 (done = dark check, current = spinner + "Now", pending = dashed circle).
Counter "4 / 6" = filled fields.

## 6. Screen-by-screen

**01 Welcome** — orb idle + animated line; "Hello…"; headline; primary **Hold to talk** (380×88);
"• EXAMPLES" + 3 tappable cards (icon + title): Café happy hour, Ramadan campaign, Online sales.

**02 Listening** — orb `listen` (340) + "● Listening 00:07" (pink blinking dot, live timer);
waveform (live mic levels); **live captions** at 40 px, finalized words dark, interim words faded `#8796AB`, blinking caret;
**Cancel** + **Release to send** (button shows pressed state: 8 px tint ring). Releasing sends; sliding the finger off the button cancels.

**03 Conversation** — left: orb `speak` (220), last visitor answer in quotes (muted), AI question as H1 (52 px),
2×2 quick-answer buttons (contextual to the question); right: brief checklist + **Hold to answer**.
The AI speaks the question in Kuwaiti Arabic; on-screen text follows the EN/AR toggle.

**04 Create** — orb `create` (360) with floating keyword chips pulled from the brief (Salmiya, After work, 5–8 PM, Reels);
"Watch us create…" / "Building your campaign"; 4 stages: Your brief → Your audience → The big idea → Channels & timeline
(active stage has spinner + shimmering text); gradient progress bar. Total 30–40 s even if the API is faster.

**05 Preview** — "Your campaign…" + campaign name (76 px); idea card (1 line);
dark key-message card; channels chips (4); "4 weeks" timeline (Tease, Launch, Creators, Optimize);
**Email me the full plan** + **Not now**.

**06 Email** — orb `speak`; "Almost done…" / "Where should we send it?"; Email input (focused style: 2.5 px cyan border + 6 px tint ring)
+ domain shortcut chips (@gmail.com, @outlook.com, @icloud.com append to the input);
Name (optional); "MCG can contact me" checkbox (checked by default only if legal approves — confirm); **Send**; "We never share your email · Privacy".
Use the native iPad keyboard (`type="email"`, `inputmode="email"`, `autocomplete="email"`). Keep the form in the top half so the keyboard doesn't cover it.

**07 Thank you** — orb idle with check badge + animated line; "Thank you, {name}…"; "It's on its way."; email address;
"Let's make it happen" + WhatsApp and Instagram **QR codes** (generate real QR codes from settings);
countdown ring (15 → 0) + **Start over**.

## 7. Global behaviour

- **Inactivity**: 60 s with no touch/voice (90 s on Email) → show "Still there?" modal with 10 s countdown → reset to Welcome. Copy in `reference/orb-states-and-errors.html`.
- **Language toggle**: switches all UI text and sets `dir="rtl"` + Arabic font; layout mirrors (see `reference/rtl-arabic-*.html`). The AI voice is always Kuwaiti Arabic.
- **Errors** (copy + layout in the reference file): mic not available, didn't catch that, network/reconnecting (keep the brief), invalid email (inline, Send disabled).
- **Privacy**: clear all session state on reset; never persist audio on device.
- Put all copy (EN + AR) in one i18n file; no hard-coded strings in components.

## 8. Back end (mock first)

Build with mocked services behind interfaces so the UI is complete before the AI is wired:

```ts
SpeechToText.start(onPartial, onFinal, onLevel) / stop()
Conversation.next(brief, lastAnswer) -> { question, quickAnswers[], briefUpdates, done }
TextToSpeech.speak(text, lang='ar-KW', onLevel) -> Promise<void>
Strategy.generate(brief) -> { name, idea, keyMessage, channels[], weeks[] }
Email.send({ email, name, consent, strategyId })
```

Use the sample content in the screens (Bloom Coffee / Salmiya / "The 5 PM Reset") as the mock responses.

## 9. Done means

- Each screen at 1366×1024 matches its screenshot (side-by-side or Playwright visual diff, tolerance ~2%).
- The full flow runs end to end with mocks, including hold-to-talk, quick answers, examples, timeouts and Start over.
- EN and AR both work; AR is fully RTL.
- No console errors; 60 fps animations on iPad Pro.
