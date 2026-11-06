import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "@/lib/config";
import { BRIEF_FIELDS, type StrategyRequest } from "@/lib/schemas";
import type { Localized, Strategy } from "@/lib/services/types";
import { fit, tooLong } from "@/lib/text";
import { generateJson, ThinkingLevel } from "./gemini";
import { STRATEGY_SYSTEM } from "./prompts";

const Text = z.object({ en: z.string(), ar: z.string().describe("Modern Standard Arabic (Fusha), no dialect") });
const Points = (min: number, max: number) => z.array(Text).min(min).max(max);

/**
 * Written in three structured-output calls so each stays well inside the 25 s cap:
 * the core strategy first, then the departments in two parallel calls that build on it.
 */
const Core = z.object({
  headline: Text,
  summary: Text,
  objective: Text.describe("What success looks like, no numbers or multipliers"),
  funnelStage: Text,
  audience: Text,
  keywords: Points(4, 4),
});
const PartA = z.object({
  marketing: z.object({ title: Text, idea: Text, points: Points(2, 3) }),
  socialMedia: z.object({ title: Text, idea: Text, platforms: z.array(z.object({ name: Text, role: Text })).min(2).max(3) }),
  nextStep: Text,
});
const PartB = z.object({
  influencers: z.object({ title: Text, idea: Text, mix: Text, points: Points(2, 2) }),
  event: z.object({ title: Text, idea: Text, when: Text, points: Points(2, 2) }),
  activation: z.object({ title: Text, idea: Text, points: Points(2, 2), offers: Points(2, 3) }),
});

/** The whole strategy as the model parts assemble it (without the server-made id). */
const _ModelStrategy = z.object({
  headline: Text,
  summary: Text,
  objective: Text,
  funnelStage: Text,
  audience: Text,
  marketing: z.object({ title: Text, idea: Text, points: Points(2, 3) }),
  socialMedia: z.object({ title: Text, idea: Text, platforms: z.array(z.object({ name: Text, role: Text })).min(2).max(3) }),
  influencers: z.object({ title: Text, idea: Text, mix: Text, points: Points(2, 2) }),
  event: z.object({ title: Text, idea: Text, when: Text, points: Points(2, 2) }),
  activation: z.object({ title: Text, idea: Text, points: Points(2, 2), offers: Points(2, 3) }),
  nextStep: Text,
  keywords: Points(4, 4),
});
type ModelStrategy = z.infer<typeof _ModelStrategy>;

const L = config.limits;
const over = (t: Localized, max: number) => tooLong(t.en, max) || tooLong(t.ar, max);
const both = (t: Localized, max: number, ellipsis = false): Localized => ({ en: fit(t.en, max, { ellipsis }), ar: fit(t.ar, max, { ellipsis }) });

interface Slot {
  key: string;
  get: () => Localized;
  set: (v: Localized) => void;
  max: number;
  /** Sentences end in "…" when cut; labels are cut at a word. */
  sentence: boolean;
}

/**
 * MCG wants no dashes in the copy: "5–8 PM" → "5 to 8 PM", "calm — then" → "calm, then",
 * "after-work" → "after work". The prompt asks for this too; this catches what slips through.
 */
function noDashes(text: string, lang: "en" | "ar"): string {
  return text
    .replace(/([\d٠-٩])\s*[-–—]\s*([\d٠-٩])/g, lang === "ar" ? "$1 إلى $2" : "$1 to $2")
    .replace(/\s*[–—]\s*/g, lang === "ar" ? "، " : ", ")
    .replace(/(\S)-(\S)/g, "$1 $2")
    .replace(/\s+-\s+/g, lang === "ar" ? "، " : ", ")
    .replace(/^[\s,،]+|[\s,،]+$/g, "");
}

/** Every text slot with its limit, addressed by key so one shorten pass can rewrite the long ones. */
function slots(s: ModelStrategy): Slot[] {
  const one = (key: string, obj: Record<string, Localized>, field: string, max: number, sentence = false): Slot => ({
    key,
    get: () => obj[field],
    set: (v) => (obj[field] = v),
    max,
    sentence,
  });
  const list = (key: string, arr: Localized[], max: number, sentence = false): Slot[] =>
    arr.map((_, i) => ({ key: `${key}${i}`, get: () => arr[i], set: (v) => (arr[i] = v), max, sentence }));
  const top = s as unknown as Record<string, Localized>;
  return [
    one("headline", top, "headline", L.headline),
    one("summary", top, "summary", L.summary, true),
    one("objective", top, "objective", L.parameter),
    one("funnelStage", top, "funnelStage", L.parameter),
    one("audience", top, "audience", L.parameter),
    ...(["marketing", "socialMedia", "influencers", "event", "activation"] as const).flatMap((d) => [
      one(`${d}Title`, s[d] as unknown as Record<string, Localized>, "title", L.cardTitle),
      one(`${d}Idea`, s[d] as unknown as Record<string, Localized>, "idea", L.cardIdea, true),
    ]),
    ...list("marketingPoint", s.marketing.points, L.point, true),
    ...s.socialMedia.platforms.flatMap((p, i) => [
      one(`platformName${i}`, p as unknown as Record<string, Localized>, "name", L.platformName),
      one(`platformRole${i}`, p as unknown as Record<string, Localized>, "role", L.platformRole, true),
    ]),
    one("influencerMix", s.influencers as unknown as Record<string, Localized>, "mix", L.influencerMix),
    ...list("influencerPoint", s.influencers.points, L.point, true),
    one("eventWhen", s.event as unknown as Record<string, Localized>, "when", L.eventWhen),
    ...list("eventPoint", s.event.points, L.point, true),
    ...list("activationPoint", s.activation.points, L.point, true),
    ...list("offer", s.activation.offers, L.point, true),
    one("nextStep", top, "nextStep", L.nextStep, true),
    ...list("keyword", s.keywords, L.keyword),
  ];
}

export async function generateStrategy({ brief, lang }: StrategyRequest): Promise<Strategy> {
  const prompt = JSON.stringify(
    {
      screenLanguage: lang,
      brief: Object.fromEntries(BRIEF_FIELDS.filter((f) => brief[f]).map((f) => [f, brief[f]])),
      brandName: brief.brandName ?? "",
      keywordsHeard: brief.keywords ?? [],
    },
    null,
    1,
  );

  // "double", "tripling", "guarantee", "3x", "3 x", "50%": promised results.
  const promise = /\b(doubl|tripl|guarantee|\d+\s?x\b|\d+\s?%)/i;
  const call = <T,>(schema: z.ZodType<T>, task: string, check?: (d: T) => string | null) =>
    generateJson({
      model: config.models.strategy,
      system: STRATEGY_SYSTEM,
      prompt: `${task}

${prompt}`,
      schema,
      temperature: 0.8,
      thinking: process.env.GEMINI_STRATEGY_THINKING === "high" ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
      check,
    });

  // 1. The core: the diagnosis every department builds on.
  const core = await call(Core, "TASK: write only the core of the strategy (headline, summary, objective, funnelStage, audience, keywords).", (d) =>
    promise.test(d.objective.en + d.summary.en + d.headline.en) ? "Never promise results or put numbers in the objective, summary or headline." : null,
  );
  // 2. The departments, in parallel, from that core.
  const given = `CORE STRATEGY (already decided; every idea must serve it):
${JSON.stringify(core)}`;
  const [a, b] = await Promise.all([
    call(PartA, `TASK: write only marketing, socialMedia and nextStep.
${given}`),
    call(PartB, `TASK: write only influencers, event and activation.
${given}`),
  ]);
  const s: ModelStrategy = { ...core, ...a, ...b };

  // Clean cut for anything still over its slot (sentences end in "…", labels cut at a word).
  for (const x of slots(s)) {
    const v = x.get();
    x.set({ en: noDashes(v.en, "en"), ar: noDashes(v.ar, "ar") });
    if (over(x.get(), x.max)) x.set(both(x.get(), x.max, x.sentence));
  }

  return { id: randomUUID(), ...s };
}
