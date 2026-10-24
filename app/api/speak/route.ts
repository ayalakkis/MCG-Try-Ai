import { config } from "@/lib/config";
import { SpeakRequestSchema } from "@/lib/schemas";
import { fail, limit, readJson } from "@/lib/server/http";
import { synthesize } from "@/lib/server/tts";

export const runtime = "nodejs";
/** 25 s per Gemini TTS attempt + 1 retry. */
export const maxDuration = 60;

/** POST { text, lang } (one line in the screen language) → audio/wav the browser can decode and play. */
export async function POST(req: Request) {
  try {
    limit(req, "speak", config.rateLimit.speak);
    const { text, lang } = await readJson(req, SpeakRequestSchema);
    const wav = await synthesize(text.slice(0, config.voice.maxSpeakChars), lang);
    return new Response(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav", "Content-Length": String(wav.length), "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
