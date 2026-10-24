/**
 * Browser clients for the route handlers in app/api/*. No keys here: every AI call runs on the server.
 */
import type { z } from "zod";
import { LiveCaptions } from "../audio/captions";
import { Player } from "../audio/player";
import { Recorder } from "../audio/recorder";
import type { Lang } from "../i18n";
import {
  ApiErrorSchema,
  ConversationTurnSchema,
  EmailResponseSchema,
  LeadResponseSchema,
  StrategySchema,
  TranscribeResponseSchema,
} from "../schemas";
import { ServiceError } from "./errors";
import type { Conversation, EmailService, LeadService, SpeechToText, StrategyService, TextToSpeech } from "./interfaces";
import type { Brief, ConversationInput, EmailRequest, LeadInput, LevelListener, ListenOptions } from "./types";

export { ServiceError };

async function parse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorSchema.safeParse(json);
    throw err.success
      ? new ServiceError(err.data.state, err.data.error, err.data.retryAfter)
      : new ServiceError("reconnecting", `http_${res.status}`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ServiceError("reconnecting", "bad_response");
  return parsed.data;
}

/**
 * POST and validate the reply. The server already does the 25 s timeout + retry per upstream
 * call, so the client timeout only guards against a hung connection; a dropped connection
 * (fetch TypeError) is retried once.
 */
async function post<T>(url: string, body: BodyInit | object, schema: z.ZodType<T>, timeoutMs: number): Promise<T> {
  const isForm = body instanceof FormData;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: isForm ? undefined : { "Content-Type": "application/json" },
        body: isForm ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      if (attempt === 0 && e instanceof TypeError) continue;
      throw new ServiceError("reconnecting", e instanceof DOMException && e.name === "TimeoutError" ? "timeout" : "network");
    }
    return parse(res, schema);
  }
}

export class HttpConversation implements Conversation {
  next(input: ConversationInput) {
    return post("/api/conversation", input, ConversationTurnSchema, 65_000);
  }
}

export class HttpStrategy implements StrategyService {
  generate(brief: Brief, lang: Lang, sessionId?: string) {
    return post("/api/strategy", { brief, lang, sessionId: sessionId || undefined }, StrategySchema, 95_000);
  }
}

export class HttpEmail implements EmailService {
  async send(req: EmailRequest) {
    const { id } = await post("/api/email", req, EmailResponseSchema, 65_000);
    return { ok: true as const, id };
  }
}

export class HttpLeads implements LeadService {
  async save(lead: LeadInput) {
    const { saved } = await post("/api/leads", lead, LeadResponseSchema, 20_000);
    return saved;
  }
}

/**
 * Hold to talk → MediaRecorder (live levels from an AnalyserNode) → /api/transcribe (Gemini).
 * Interim captions come from the browser's SpeechRecognition where it can run next to the recorder.
 */
/** Peak level (dB-mapped 0–1, about -40 dB) below which a recording holds no speech. */
const MIN_SPEECH_LEVEL = 0.35;

export class HttpSpeechToText implements SpeechToText {
  private recorder: Recorder | null = null;
  private captions = new LiveCaptions();
  private options: ListenOptions = {};
  /** Loudest level heard this hold (0–1); nothing near speech level = nothing to transcribe. */
  private peak = 0;
  /** What the browser live captions heard, sent along as a hint. */
  private caption = { final: "", interim: "" };
  /** Timings of the last utterance, for /voice-lab. */
  last: { recordMs: number; bytes: number; mimeType: string; transcribeMs: number } | null = null;

  constructor(private captionMode?: "auto" | "on" | "off") {}

  async start(onPartial: (t: string) => void, onFinal: (t: string) => void, onLevel: LevelListener, options: ListenOptions = {}) {
    this.cancel();
    this.options = options;
    const recorder = new Recorder();
    this.recorder = recorder;
    this.peak = 0;
    const started = recorder.start((l) => {
      this.peak = Math.max(this.peak, l);
      onLevel(l);
    });
    this.caption = { final: "", interim: "" };
    this.captions.start(
      options.lang ?? "en",
      (t) => {
        this.caption.final = t;
        onFinal(t);
      },
      (t) => {
        this.caption.interim = t;
        onPartial(t);
      },
      this.captionMode,
    );
    await started;
  }

  async stop(): Promise<string> {
    const recorder = this.recorder;
    this.recorder = null;
    this.captions.stop();
    if (!recorder) return "";
    const rec = await recorder.stop();
    if (rec.blob.size < 800) throw new ServiceError("missed", "too_short");
    // Silence or a muted mic: skip the upload and show "Didn't catch that" straight away.
    if (this.peak < MIN_SPEECH_LEVEL) throw new ServiceError("missed", "too_quiet");

    const form = new FormData();
    const ext = rec.mimeType.includes("mp4") ? "m4a" : rec.mimeType.includes("ogg") ? "ogg" : rec.mimeType.includes("wav") ? "wav" : "webm";
    form.append("audio", rec.blob, `answer.${ext}`);
    form.append("lang", this.options.lang ?? "en");
    if (this.options.expect) form.append("expect", this.options.expect);
    if (this.options.question) form.append("question", this.options.question);
    const hint = `${this.caption.final} ${this.caption.interim}`.trim();
    if (hint) form.append("hint", hint);

    const t0 = performance.now();
    const { text } = await post("/api/transcribe", form, TranscribeResponseSchema, 65_000);
    this.last = { recordMs: Math.round(rec.durationMs), bytes: rec.blob.size, mimeType: rec.mimeType, transcribeMs: Math.round(performance.now() - t0) };
    return text;
  }

  cancel() {
    this.captions.stop();
    this.recorder?.cancel();
    this.recorder = null;
  }
}

/**
 * /api/speak (Gemini TTS, WAV) → Web Audio, with the envelope reported for the Orb.
 * Voice is a bonus on top of the on-screen text, so failures resolve quietly.
 */
export class HttpTextToSpeech implements TextToSpeech {
  private player = new Player();
  private abort: AbortController | null = null;
  /** Timings of the last line, for /voice-lab. */
  last: { fetchMs: number; bytes: number } | null = null;

  async speak(text: string, lang = "ar-KW", onLevel?: LevelListener) {
    this.stop();
    const ctrl = new AbortController();
    this.abort = ctrl;
    try {
      const t0 = performance.now();
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: lang.startsWith("en") ? "en" : "ar" }),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(60_000)]),
      });
      if (!res.ok) throw new ServiceError("reconnecting", `speak_${res.status}`);
      const data = await res.arrayBuffer();
      this.last = { fetchMs: Math.round(performance.now() - t0), bytes: data.byteLength };
      if (ctrl.signal.aborted) return;
      await this.player.play(data, onLevel);
    } catch (e) {
      if (!ctrl.signal.aborted) console.warn("[tts]", e);
    } finally {
      if (this.abort === ctrl) this.abort = null;
    }
  }

  stop() {
    this.abort?.abort();
    this.abort = null;
    this.player.stop();
  }
}
