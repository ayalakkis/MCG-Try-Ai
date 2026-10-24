/**
 * App configuration. Safe to import on the client: no secrets here.
 * Keys live only in process.env on the server (see lib/server/*).
 */

export const config = {
  /** Gemini models (ai.google.dev/gemini-api/docs/models, checked Oct 2026). Override per env. */
  models: {
    /** Fast stable Flash for conversation turns and transcription. */
    conversation: process.env.GEMINI_CONVERSATION_MODEL ?? "gemini-3.8-flash",
    transcription: process.env.GEMINI_TRANSCRIPTION_MODEL ?? "gemini-3.8-flash",
    /** Dedicated speech-to-text model used only to check that someone spoke (it never invents words). */
    speechGate: process.env.GEMINI_SPEECH_GATE_MODEL ?? "gemini-3.5-transcribe",
    /**
     * Tested Oct 2026 on the full plan with low thinking: 3.8 Flash 16–18 s with fresh, Kuwaiti copy.
     * gemini-3.1-pro-preview (~25–40 s) and gemini-4-argon (~34 s) exceed the 25 s cap per attempt
     * and only end up falling back; use them only with a longer strategy timeout.
     */
    strategy: process.env.GEMINI_STRATEGY_MODEL ?? "gemini-3.8-flash",
    /** Low-latency TTS for conversational turns ("gemini-3.8-flash-tts" = higher fidelity). */
    tts: process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-lite-tts",
    /**
     * Prebuilt voice, or a regional voice id from the Extended Voice Library. The accent comes
     * from the voice, not the style prompt: `npm run voices` lists the Gulf Arabic voices.
     */
    ttsVoice: process.env.GEMINI_TTS_VOICE ?? "Kore",
    /** Turn-level delivery per screen language (speech_metadata.style). */
    ttsStyle: {
      en: "warm and friendly, natural conversational English, natural pace",
      ar: "warm and friendly, clear Modern Standard Arabic (Fusha) pronunciation, natural pace",
    },
  },

  /**
   * Next model to try when one is overloaded (503), out of quota or not offered to the key (429/404),
   * or times out. Used by generateJson (lib/server/gemini.ts) and TTS; at most 3 hops per call.
   */
  fallbacks: {
    "gemini-4-argon": "gemini-3.8-flash",
    "gemini-3.1-pro-preview": "gemini-3.8-flash",
    "gemini-3.8-flash": "gemini-3.6-flash",
    "gemini-3.6-flash": "gemini-3.5-flash-lite",
    "gemini-3.8-flash-lite-tts": "gemini-3.8-flash-tts",
    "gemini-3.8-flash-tts": "gemini-3.8-flash-lite-tts",
  },

  ai: {
    /** Per attempt. */
    timeoutMs: 25_000,
    retries: 1,
  },

  /**
   * Requests per IP per window (in-memory, per server instance). The booth iPad is one IP
   * for every visitor, so the limits are sized for a busy booth, not for one person.
   */
  rateLimit: {
    conversation: { limit: 40, windowMs: 60_000 },
    strategy: { limit: 6, windowMs: 60_000 },
    email: { limit: 20, windowMs: 10 * 60_000 },
    emailPerAddress: { limit: 3, windowMs: 60 * 60_000 },
    transcribe: { limit: 40, windowMs: 60_000 },
    speak: { limit: 60, windowMs: 60_000 },
    leads: { limit: 20, windowMs: 10 * 60_000 },
  },

  voice: {
    /** Shorter holds count as an accidental tap (no "Didn't catch that"). */
    minHoldMs: 450,
    /** Vercel caps request bodies at 4.5 MB; 60 s of AAC at 64 kbps is about 0.5 MB. */
    maxUploadBytes: 4 * 1024 * 1024,
    /** Longest text sent to TTS (a question is at most limits.question). */
    maxSpeakChars: 400,
    /**
     * Interim captions from the browser's SpeechRecognition while recording. "auto" skips
     * iPad/iPhone, where Safari shares one mic between it and MediaRecorder; try "on" in /voice-lab.
     */
    liveCaptions: "auto" as "auto" | "on" | "off",
  },

  /** Seconds (HANDOFF.md §7). */
  timers: {
    inactivity: 60,
    inactivityEmail: 90,
    stillThere: 10,
    thanks: 15,
  },

  /** Most AI turns before CREATE starts anyway. */
  maxTurns: 8,

  /**
   * Max characters per designed slot, so AI text never overflows the iPad layout.
   * Sized against design/screens/03-conversation.html and 05-preview.html.
   */
  limits: {
    question: 72,
    quickAnswer: 22,
    briefValue: 20,
    keyword: 14,
    /* Strategy (PREVIEW screen + email). Card text is clamped on screen; the detail sheet shows it all. */
    headline: 64,
    summary: 200,
    parameter: 44,
    cardTitle: 32,
    cardIdea: 170,
    point: 125,
    platformName: 18,
    platformRole: 72,
    influencerMix: 44,
    eventWhen: 32,
    splitChannel: 24,
    budgetNote: 120,
    nextStep: 140,
    /** "Bloom Coffee" in the email headline. */
    brandName: 32,
    /** Optional name on screen 06 ("Thank you, Sara…"). */
    visitorName: 40,
  },

  /** QR codes on Thank you + links in the email (MCG's Instagram bio, Oct 2026). */
  links: {
    /** MCG's WhatsApp: +965 9918 1416 (wa.me takes the number without "+" or spaces). */
    whatsapp: "https://wa.me/96599181416",
    instagram: "https://www.instagram.com/mcgroupkw/",
    website: "https://www.mcgmasters.com",
    /** The email is a one-off; this lets people ask MCG not to contact them. */
    unsubscribe: "mailto:info@mcgmasters.com?subject=Unsubscribe",
  },

  /** TODO(MCG): event name in the email footer ("…at MCG's booth at [Event name], Kuwait"). */
  event: { en: "the event", ar: "الفعالية" },
} as const;

export type AppConfig = typeof config;
