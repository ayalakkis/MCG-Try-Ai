import { HttpConversation, HttpEmail, HttpLeads, HttpSpeechToText, HttpStrategy, HttpTextToSpeech } from "./http";
import type { Services } from "./interfaces";
import { createMockServices } from "./mock";

export type { Services } from "./interfaces";
export * from "./types";

/**
 * Inlined at build time by next.config.ts. AI (speech, conversation, voice, strategy) is mocked
 * when USE_MOCKS=true or no GEMINI_API_KEY is set; email + leads when USE_MOCKS=true or
 * RESEND_API_KEY / EMAIL_FROM are missing. So the app always runs offline without keys.
 * Restart `npm run dev` after adding keys.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
export const MOCK_EMAIL = process.env.NEXT_PUBLIC_MOCK_EMAIL === "true";

let instance: Services | null = null;

/** Single place that decides mock vs real. */
export function getServices(): Services {
  if (instance) return instance;
  const mocks = createMockServices();
  const ai = USE_MOCKS
    ? {}
    : { stt: new HttpSpeechToText(), conversation: new HttpConversation(), tts: new HttpTextToSpeech(), strategy: new HttpStrategy() };
  const mail = MOCK_EMAIL ? {} : { email: new HttpEmail(), leads: new HttpLeads() };
  instance = { ...mocks, ...ai, ...mail };
  return instance;
}
