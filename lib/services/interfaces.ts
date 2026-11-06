import type { Lang } from "../i18n";
import type { Brief, EmailRequest, LeadInput, LevelListener, Strategy } from "./types";

export interface TextToSpeech {
  /** Speaks text in the given language (BCP 47, e.g. "en-US", "ar-KW") and reports the audio envelope 0–1. */
  speak(text: string, lang?: string, onLevel?: LevelListener): Promise<void>;
  stop(): void;
}

export interface StrategyService {
  generate(brief: Brief, lang: Lang, sessionId?: string): Promise<Strategy>;
}

export interface EmailService {
  send(req: EmailRequest): Promise<{ ok: true; id?: string }>;
}

/** Saves a consented lead after the email is sent. Resolves false when storage is off. */
export interface LeadService {
  save(lead: LeadInput): Promise<boolean>;
}

export interface Services {
  tts: TextToSpeech;
  strategy: StrategyService;
  email: EmailService;
  leads: LeadService;
}
