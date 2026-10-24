import { config } from "@/lib/config";
import { BriefFieldSchema, LangSchema, TranscribeResponseSchema } from "@/lib/schemas";
import { fail, HttpError, limit, ok } from "@/lib/server/http";
import { geminiMime, transcribe } from "@/lib/server/transcribe";

export const runtime = "nodejs";
/** 25 s per Gemini attempt + 1 retry. */
export const maxDuration = 60;

/**
 * POST multipart/form-data { audio: File, lang: "en"|"ar", expect?: brief field, hint?: live caption, question?: on-screen question } → { text }.
 * The audio is only held in memory for this request and never stored.
 * Nothing intelligible → 422 { state: "missed" } ("Didn't catch that").
 */
export async function POST(req: Request) {
  try {
    limit(req, "transcribe", config.rateLimit.transcribe);
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > config.voice.maxUploadBytes + 64 * 1024) throw new HttpError(413, "audio_too_large", "missed");

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new HttpError(400, "invalid_form");
    }
    const audio = form.get("audio");
    const lang = LangSchema.safeParse(form.get("lang") ?? "en");
    const expectRaw = form.get("expect");
    const expect = expectRaw ? BriefFieldSchema.safeParse(expectRaw) : null;
    const hintRaw = form.get("hint");
    const hint = typeof hintRaw === "string" ? hintRaw.trim().slice(0, 600) : "";
    const questionRaw = form.get("question");
    const question = typeof questionRaw === "string" ? questionRaw.trim().slice(0, 200) : "";
    if (!(audio instanceof File) || !lang.success || (expect && !expect.success)) throw new HttpError(400, "invalid_input");
    if (audio.size === 0) throw new HttpError(422, "empty_audio", "missed");
    if (audio.size > config.voice.maxUploadBytes) throw new HttpError(413, "audio_too_large", "missed");
    const mime = geminiMime(audio.type, audio.name);
    if (!mime) throw new HttpError(415, "unsupported_audio", "missed");

    const text = await transcribe(Buffer.from(await audio.arrayBuffer()), mime, lang.data, expect?.success ? expect.data : null, hint, question);
    return ok(TranscribeResponseSchema, { text });
  } catch (e) {
    return fail(e);
  }
}
