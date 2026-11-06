/**
 * Browser clients for the route handlers in app/api/*. No keys here: every AI call runs on the server.
 */
import type { z } from "zod";
import { Player } from "../audio/player";
import type { Lang } from "../i18n";
import {
  ApiErrorSchema,
  EmailResponseSchema,
  LeadResponseSchema,
  StrategySchema,
} from "../schemas";
import { ServiceError } from "./errors";
import type { EmailService, LeadService, StrategyService, TextToSpeech } from "./interfaces";
import type { Brief, EmailRequest, LeadInput, LevelListener } from "./types";

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
