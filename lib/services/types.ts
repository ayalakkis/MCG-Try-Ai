import type { z } from "zod";
import type { Lang } from "../i18n";
import { BRIEF_FIELDS, type StrategySchema } from "../schemas";

export { BRIEF_FIELDS };

/** Text the UI can show in either language. */
export type Localized = Record<Lang, string>;

export type BriefField = (typeof BRIEF_FIELDS)[number];
export type Brief = Partial<Record<BriefField, Localized>> & {
  /** Short phrases from the visitor's answers; float around the orb on CREATE. */
  keywords?: Localized[];
  /** The business name if the visitor typed it ("Bloom Coffee"); used in the email headline. */
  brandName?: string;
  /** Industry option id from the first question ("cafe"); picks the result photos. */
  industry?: string;
};

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
