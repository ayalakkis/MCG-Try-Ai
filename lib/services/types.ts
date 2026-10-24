import type { z } from "zod";
import type { Lang } from "../i18n";
import { BRIEF_FIELDS, type StrategySchema } from "../schemas";

export { BRIEF_FIELDS };

/** Text the UI can show in either language. */
export type Localized = Record<Lang, string>;

export type BriefField = (typeof BRIEF_FIELDS)[number];
export type Brief = Partial<Record<BriefField, Localized>> & {
  /** Short phrases the AI pulled from the visitor's answers; float around the orb on CREATE. */
  keywords?: Localized[];
  /** The business name if the visitor said it ("Bloom Coffee"); used in the email headline. */
  brandName?: string;
};

export interface QuickAnswer {
  id: string;
  /** Button text. */
  label: Localized;
  /** Short value written to the brief checklist, when it differs from the label. */
  value?: Localized;
}

export interface ListenOptions {
  lang?: Lang;
  /** Brief field the AI just asked about; a real recogniser can use it as a phrase hint. */
  expect?: BriefField | null;
  /** The question on screen, in the screen language: context for the transcriber. */
  question?: string;
}

export interface HistoryItem {
  role: "ai" | "visitor";
  text: string;
}

export interface ConversationInput {
  lang: Lang;
  brief: Brief;
  /** Earlier turns, oldest first (not including lastAnswer). */
  history: HistoryItem[];
  lastAnswer: string | null;
}

export interface ConversationTurn {
  /** The question the AI asks next (shown as H1 and spoken in the screen language). */
  question: Localized;
  /** Field currently being asked about ("Now" in the checklist). */
  asking: BriefField | null;
  quickAnswers: QuickAnswer[];
  briefUpdates: Brief;
  done: boolean;
}

/** Full strategy: short fields fill the PREVIEW slots, the rest goes into the email. */
export type Strategy = z.infer<typeof StrategySchema>;

export interface EmailRequest {
  email: string;
  name?: string;
  consent: boolean;
  lang: Lang;
  strategy: Strategy;
  brief: Brief;
  /** Visitor session id (idempotent retries). */
  sessionId?: string;
}

export interface LeadInput {
  sessionId: string;
  email: string;
  name?: string;
  consent: boolean;
  lang: Lang;
  brief: Brief;
  strategyName: Localized;
}

/** Callback for audio levels, RMS mapped to 0–1. */
export type LevelListener = (level: number) => void;
