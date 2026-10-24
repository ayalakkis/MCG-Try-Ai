import type { Lang } from "../i18n";
import type { Brief, ConversationInput, ConversationTurn, ListenOptions, EmailRequest, LeadInput, LevelListener, Strategy } from "./types";

export interface SpeechToText {
  /** Starts capture. onPartial streams interim text, onFinal the settled text, onLevel live mic RMS 0–1. */
  start(
    onPartial: (text: string) => void,
    onFinal: (text: string) => void,
    onLevel: LevelListener,
    options?: ListenOptions,
  ): Promise<void>;
  /** Stops capture and resolves with the final transcript ("" or ServiceError("missed") = nothing heard). */
  stop(): Promise<string>;
  /** Aborts without producing a transcript (finger slid off the button). */
  cancel(): void;
}

export interface Conversation {
  next(input: ConversationInput): Promise<ConversationTurn>;
}

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
  stt: SpeechToText;
  conversation: Conversation;
  tts: TextToSpeech;
  strategy: StrategyService;
  email: EmailService;
  leads: LeadService;
}
