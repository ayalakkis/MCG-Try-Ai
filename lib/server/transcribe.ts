import "server-only";
import { z } from "zod";
import { config } from "@/lib/config";
import type { Lang } from "@/lib/i18n";
import type { BriefField } from "@/lib/services/types";
import { gemini, generateJson, ThinkingLevel } from "./gemini";
import { HttpError } from "./http";
import { TRANSCRIBE_SYSTEM } from "./prompts";

/**
 * Browser recording types → Gemini audio MIME types (ai.google.dev/gemini-api/docs/audio).
 * iPad Safari records audio/mp4 (AAC in an MP4 container), which is the same format as M4A.
 */
const MIME: Record<string, string> = {
  "audio/mp4": "audio/m4a",
  "audio/x-m4a": "audio/m4a",
  "audio/m4a": "audio/m4a",
  "audio/aac": "audio/aac",
  "audio/webm": "audio/webm",
  "audio/ogg": "audio/ogg",
  "audio/opus": "audio/opus",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mp3",
  "audio/flac": "audio/flac",
  // Safari sometimes labels audio-only MP4 as video/mp4.
  "video/mp4": "audio/m4a",
  "video/webm": "audio/webm",
};

export function geminiMime(type: string, filename = ""): string | null {
  const base = type.split(";")[0].trim().toLowerCase();
  if (MIME[base]) return MIME[base];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "m4a" || ext === "mp4" ? "audio/m4a" : ext === "webm" ? "audio/webm" : ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : null;
}

/** Decide first whether anyone speaks (field order is the order the model writes them). */
const Transcript = z.object({
  speech: z.boolean().describe("Is a human voice clearly saying words in this recording? false for silence, noise, beeps, tones or music"),
  text: z.string().describe("If speech: exactly what was said, in the script it was spoken. Otherwise empty"),
});

const FIELD_HINT: Record<BriefField, string> = {
  business: "what their business is",
  goal: "what their marketing should achieve",
  audience: "who they want to reach",
  location: "where the business is (often a Kuwaiti area: Salmiya, Hawalli, Jabriya, Kuwait City…)",
};

/**
 * Speech gate: the dedicated speech-to-text model (gemini-3.5-transcribe) returns nothing for
 * silence, noise, beeps or music, while general models invent a plausible answer from them.
 * Returns its transcript ("" = nobody spoke), or null if the gate itself failed (then the
 * main transcription decides alone).
 */
async function speechGate(audio: Buffer, mimeType: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    const res = await gemini().models.generateContent({
      model: config.models.speechGate,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: audio.toString("base64") } }] }],
      config: { abortSignal: controller.signal },
    });
    const parts = (res.candidates?.[0]?.content?.parts ?? []) as { text?: string; audioTranscription?: { text?: string } }[];
    return parts.map((p) => p.audioTranscription?.text ?? p.text ?? "").join(" ").replace(/\s+/g, " ").trim();
  } catch (e) {
    console.warn(`[transcribe] speech gate ${config.models.speechGate} failed: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One short spoken answer → text. Runs in parallel: the speech gate (did anyone speak?) and the
 * Flash model (accurate Kuwaiti Arabic / English / mixed text). Nothing heard by the gate, or
 * nothing intelligible to Flash → HttpError("missed"), so the app shows "Didn't catch that".
 */
export async function transcribe(audio: Buffer, mimeType: string, lang: Lang, expect: BriefField | null, hint = "", question = ""): Promise<string> {
  // No hint about what the visitor is likely to say: on silence or noise that primes the model
  // to invent a plausible answer. Only the topic of an asked question, as a spelling aid.
  const context = [
    `The on-screen language is ${lang === "ar" ? "Arabic" : "English"}, but the speaker may use either or mix them.`,
    expect ? `If someone speaks, they may be answering a question about ${FIELD_HINT[expect]}.` : "",
    question ? `The question on screen was: "${question}"` : "",
    hint ? `Rough browser caption (may be wrong): "${hint.slice(0, 300)}"` : "",
  ].filter(Boolean).join(" ");

  const gate = speechGate(audio, mimeType);
  const main = generateJson({
    model: config.models.transcription,
    system: TRANSCRIBE_SYSTEM,
    prompt: [{ inlineData: { mimeType, data: audio.toString("base64") } }, { text: `${context}
Transcribe this recording.` }],
    schema: Transcript,
    thinking: ThinkingLevel.LOW,
    temperature: 0,
  });

  const heard = await gate;
  if (heard === "") {
    main.catch(() => {}); // nobody spoke: don't wait for (or surface) the main answer
    throw new HttpError(422, "no_speech", "missed");
  }
  let out: z.infer<typeof Transcript>;
  try {
    out = await main;
  } catch (e) {
    // Main model failed but the gate heard words: use the gate's transcript rather than an error.
    if (heard) return heard.slice(0, 600);
    throw e;
  }
  const text = out.text.replace(/\s+/g, " ").trim();
  // Placeholder outputs some models give for silence.
  const empty = !text || /^[\[(].*(silence|inaudible|no speech|noise|music).*[\])]$/i.test(text);
  if (!out.speech || empty) {
    if (heard) return heard.slice(0, 600);
    throw new HttpError(422, "no_speech", "missed");
  }
  return text.slice(0, 600);
}
