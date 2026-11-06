/**
 * Shapes shared by the browser and the route handlers (validated on both sides with zod).
 */
import { z } from "zod";

/** The brief fields, in the order the Questions screen asks them (voice, budget and timing removed at MCG's request). */
export const BRIEF_FIELDS = ["business", "audience", "goal", "challenge", "location"] as const;

export const LangSchema = z.enum(["en", "ar"]);
export const LocalizedSchema = z.object({ en: z.string().trim().min(1), ar: z.string().trim().min(1) });
export const BriefFieldSchema = z.enum(BRIEF_FIELDS);

export const BriefSchema = z.object({
  business: LocalizedSchema.optional(),
  goal: LocalizedSchema.optional(),
  audience: LocalizedSchema.optional(),
  location: LocalizedSchema.optional(),
  /** What's holding them back (question 4). */
  challenge: LocalizedSchema.optional(),
  keywords: z.array(LocalizedSchema).max(6).optional(),
  /** The business's own name if the visitor typed it ("Bloom Coffee"); used in the email headline. */
  brandName: z.string().trim().max(60).optional(),
  /** Industry option id from question 1; picks the result photos. */
  industry: z.string().max(32).optional(),
});

/* ---------- /api/strategy ---------- */

export const StrategyRequestSchema = z.object({
  lang: LangSchema,
  brief: BriefSchema,
  /** Visitor session id: links the stored session to its email and lead (admin dashboard). */
  sessionId: z.string().max(64).optional(),
});
export type StrategyRequest = z.infer<typeof StrategyRequestSchema>;

/**
 * The visitor's marketing strategy (not a campaign): one strategy line, its parameters and one idea
 * per department. The PREVIEW screen and the email show exactly these fields.
 */
const Points = z.array(LocalizedSchema).min(1).max(3);
export const StrategySchema = z.object({
  id: z.string(),
  /** The strategy in one line. */
  headline: LocalizedSchema,
  /** The real problem behind what they asked for, and the move. */
  summary: LocalizedSchema,
  /** Strategy parameters (alongside the brief). */
  objective: LocalizedSchema,
  funnelStage: LocalizedSchema,
  audience: LocalizedSchema,
  marketing: z.object({ title: LocalizedSchema, idea: LocalizedSchema, points: Points }),
  socialMedia: z.object({
    title: LocalizedSchema,
    idea: LocalizedSchema,
    platforms: z.array(z.object({ name: LocalizedSchema, role: LocalizedSchema })).min(1).max(4),
  }),
  influencers: z.object({ title: LocalizedSchema, idea: LocalizedSchema, mix: LocalizedSchema, points: Points }),
  event: z.object({ title: LocalizedSchema, idea: LocalizedSchema, when: LocalizedSchema, points: Points }),
  activation: z.object({
    title: LocalizedSchema,
    idea: LocalizedSchema,
    /** How the activation runs: practical steps for the visitor's own team. */
    points: Points,
    offers: Points,
  }),
  nextStep: LocalizedSchema,
  /** Short tags for the CREATE screen chips. */
  keywords: z.array(LocalizedSchema).max(4),
});

/* ---------- /api/email ---------- */

/** Same rule as the inline check on screen 06 (lib/email.ts). */
export const EmailAddressSchema = z
  .string()
  .trim()
  .max(254)
  .regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i);

export const EmailRequestSchema = z.object({
  email: EmailAddressSchema,
  name: z.string().trim().max(60).optional(),
  consent: z.boolean(),
  lang: LangSchema,
  strategy: StrategySchema,
  brief: BriefSchema,
  /** Visitor session id: makes a retried send idempotent. */
  sessionId: z.string().max(64).optional(),
});
export type EmailRequest = z.infer<typeof EmailRequestSchema>;

export const EmailResponseSchema = z.object({ ok: z.literal(true), id: z.string() });

/* ---------- /api/leads ---------- */

export const LeadRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  email: EmailAddressSchema,
  name: z.string().trim().max(60).optional(),
  consent: z.boolean(),
  lang: LangSchema,
  brief: BriefSchema,
  strategyName: LocalizedSchema,
});
export type LeadRequest = z.infer<typeof LeadRequestSchema>;

export const LeadResponseSchema = z.object({ ok: z.literal(true), saved: z.boolean() });

/* ---------- /api/speak ---------- */

export const SpeakRequestSchema = z.object({
  text: z.string().trim().min(1).max(400),
  /** Screen language: picks the delivery style. */
  lang: LangSchema.default("ar"),
});

/* ---------- errors ---------- */

/** Error states from design/reference/orb-states-and-errors.html. */
export const ErrorStateSchema = z.enum(["reconnecting", "invalid-email", "send-failed"]);
export type ErrorState = z.infer<typeof ErrorStateSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  state: ErrorStateSchema,
  retryAfter: z.number().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
