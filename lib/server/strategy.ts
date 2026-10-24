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
  budget: z.object({
    monthlyMin: z.number().int().describe("KWD per month"),
    monthlyMax: z.number().int().describe("KWD per month"),
    split: z.array(z.object({ channel: Text, percent: z.number().int() })).min(3).max(5),
    note: Text,
  }),
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
  budget: z.object({
    monthlyMin: z.number().int().describe("KWD per month"),
    monthlyMax: z.number().int().describe("KWD per month"),
    split: z.array(z.object({ channel: Text, percent: z.number().int() })).min(3).max(5),
    note: Text,
  }),
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
    ...s.budget.split.map((x, i) => one(`splitChannel${i}`, x as unknown as Record<string, Localized>, "channel", L.splitChannel)),
    one("budgetNote", s.budget as unknown as Record<string, Localized>, "note", L.budgetNote, true),
    one("nextStep", top, "nextStep", L.nextStep, true),
    ...list("keyword", s.keywords, L.keyword),
  ];
}

/** Whole percents that add up to exactly 100 (largest remainder). */
function normalizeSplit(split: { percent: number }[]) {
  const total = split.reduce((n, x) => n + Math.max(0, x.percent), 0) || 1;
  const raw = split.map((x) => (Math.max(0, x.percent) / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) floors[i]++;
  // No channel at 0%; any point that adds comes off the largest share, so the total stays 100.
  const pct = floors.map((f) => Math.max(1, f));
  const big = pct.indexOf(Math.max(...pct));
  pct[big] -= pct.reduce((a, b) => a + b, 0) - 100;
  split.forEach((x, i) => (x.percent = pct[i]));
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
    call(PartA, `TASK: write only marketing, socialMedia, budget and nextStep.
${given}`, (d) =>
      d.budget.monthlyMin <= 0 || d.budget.monthlyMax < d.budget.monthlyMin ? "budget: monthlyMin must be > 0 and <= monthlyMax." : null,
    ),
    call(PartB, `TASK: write only influencers, event and activation.
${given}`),
  ]);
  const s: ModelStrategy = { ...core, ...a, ...b };

  // Clean cut for anything still over its slot (sentences end in "…", labels cut at a word).
  for (const x of slots(s)) if (over(x.get(), x.max)) x.set(both(x.get(), x.max, x.sentence));

  normalizeSplit(s.budget.split);
  const round = (n: number) => (n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 50) * 50) || 50;

  return {
    id: randomUUID(),
    ...s,
    budget: { ...s.budget, monthlyMin: round(s.budget.monthlyMin), monthlyMax: Math.max(round(s.budget.monthlyMax), round(s.budget.monthlyMin)) },
  };
}
