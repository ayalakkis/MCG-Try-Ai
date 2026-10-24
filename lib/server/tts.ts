import "server-only";
import { config } from "@/lib/config";
import type { Lang } from "@/lib/i18n";
import { AiError, fallbackFor, gemini } from "./gemini";

/** 44-byte RIFF header for 16-bit mono PCM. */
function wavHeader(dataBytes: number, sampleRate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(dataBytes, 40);
  return h;
}

/**
 * Text → speech with Gemini 3.8 TTS through the Interactions API (ai.google.dev/gemini-api/docs/speech-generation).
 * Unary requests return a complete WAV (24 kHz mono 16-bit); raw L16 is wrapped in a header just in case.
 * 25 s timeout per attempt + 1 retry. The text is read verbatim; delivery comes from speech_metadata.style
 * and the accent from the chosen voice (config.models.ttsVoice).
 */
export async function synthesize(text: string, lang: Lang): Promise<Buffer> {
  const ai = gemini();
  const attempts = 1 + config.ai.retries;
  let last = new AiError("upstream", "no attempt made");
  let model: string = config.models.tts;
  let hopped = false;

  for (let attempt = 0; attempt < attempts; ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
    try {
      const interaction = await ai.interactions.create(
        {
          model,
          input: [
            {
              type: "user_input",
              content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: config.models.ttsStyle[lang] }] }],
            },
          ],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: config.models.ttsVoice }] },
          store: false,
        },
        { fetchOptions: { signal: controller.signal }, maxRetries: 0 },
      );
      const audio = interaction.output_audio;
      if (!audio?.data) throw new AiError("upstream", "no audio returned");
      const bytes = Buffer.from(audio.data, "base64");
      if (bytes.subarray(0, 4).toString("ascii") === "RIFF") return bytes;
      return Buffer.concat([wavHeader(bytes.length, audio.sample_rate ?? 24_000), bytes]);
    } catch (e) {
      if (controller.signal.aborted) last = new AiError("timeout", `no audio within ${config.ai.timeoutMs} ms`);
      else if (e instanceof AiError) last = e;
      else last = new AiError("upstream", e instanceof Error ? e.message : String(e));
      console.warn(`[tts] ${model} attempt ${attempt + 1}/${attempts} failed: ${last.kind}: ${last.message.slice(0, 300)}`);
      // Busy or not offered to this key: one hop to the other TTS model without spending the retry.
      const next = fallbackFor(model, last);
      if (next && !hopped) {
        model = next;
        hopped = true;
        continue;
      }
      attempt++;
    } finally {
      clearTimeout(timer);
    }
  }
  throw last;
}
