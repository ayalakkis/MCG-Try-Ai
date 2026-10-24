import "server-only";
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { z } from "zod";
import { config } from "@/lib/config";

export type AiErrorKind = "config" | "timeout" | "upstream" | "invalid";

export class AiError extends Error {
  constructor(
    public kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("config", "GEMINI_API_KEY is not set (add it to .env.local)");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** zod → JSON Schema for Gemini structured output (drops the $schema marker). */
function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

interface GenerateJsonOptions<T> {
  model: string;
  system: string;
  /** Text, or parts (e.g. inline audio + an instruction). */
  prompt: string | Part[];
  schema: z.ZodType<T>;
  /** Extra semantic check after zod; return an error message to trigger the retry. */
  check?: (data: T) => string | null;
  thinking?: ThinkingLevel;
  temperature?: number;
  /** Defaults to config.ai.retries. */
  retries?: number;
}

/**
 * One structured-output call with a per-attempt timeout (config.ai.timeoutMs) and retry.
 * Throws AiError so routes can map failures to the "Reconnecting" state.
 */
export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
  const ai = gemini();
  const responseJsonSchema = toGeminiSchema(opts.schema);
  const attempts = 1 + (opts.retries ?? config.ai.retries);
  let last: AiError = new AiError("upstream", "no attempt made");
  let model = opts.model;
  let hops = 0;

  for (let attempt = 0; attempt < attempts; ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
    try {
      const res = await ai.models.generateContent({
        model,
        contents: typeof opts.prompt === "string" ? opts.prompt : [{ role: "user", parts: opts.prompt }],
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema,
          temperature: opts.temperature,
          thinkingConfig: opts.thinking ? { thinkingLevel: opts.thinking } : undefined,
          abortSignal: controller.signal,
        },
      });
      const text = res.text;
      if (!text) throw new AiError("upstream", "empty response");
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AiError("invalid", "response was not JSON");
      }
      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) throw new AiError("invalid", z.prettifyError(parsed.error));
      const problem = opts.check?.(parsed.data);
      if (problem) throw new AiError("invalid", problem);
      return parsed.data;
    } catch (e) {
      if (controller.signal.aborted) last = new AiError("timeout", `no answer within ${config.ai.timeoutMs} ms`);
      else if (e instanceof AiError) last = e;
      else last = new AiError("upstream", e instanceof Error ? e.message : String(e));
      console.warn(`[gemini] ${model} attempt ${attempt + 1}/${attempts} failed: ${last.kind}: ${last.message.slice(0, 300)}`);
      // Overloaded, out of quota or not offered to this key: move down the fallback chain
      // without spending the retry (that is kept for real failures and bad answers).
      const next = fallbackFor(model, last);
      if (next && hops < MAX_HOPS) {
        console.warn(`[gemini] falling back ${model} → ${next}`);
        model = next;
        hops++;
        continue;
      }
      attempt++;
    } finally {
      clearTimeout(timer);
    }
  }
  throw last;
}

const MAX_HOPS = 3;

/** True for errors that another model may not have: capacity, quota, model not available, timeout. */
export function isUnavailable(e: AiError): boolean {
  return e.kind === "timeout" || /\b(429|503|404)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|high demand|quota/i.test(e.message);
}

/** Next model in config.fallbacks when this error is one a different model could avoid. */
export function fallbackFor(model: string, e: AiError): string | null {
  if (e.kind === "config" || !isUnavailable(e)) return null;
  return (config.fallbacks as Record<string, string>)[model] ?? null;
}

export { ThinkingLevel };
