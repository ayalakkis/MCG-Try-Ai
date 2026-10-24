import "server-only";
import { z } from "zod";
import { config } from "@/lib/config";
import { BRIEF_FIELDS, type ConversationRequest } from "@/lib/schemas";
import type { Brief, BriefField, ConversationTurn, Localized } from "@/lib/services/types";
import { fit } from "@/lib/text";
import { generateJson, ThinkingLevel } from "./gemini";
import { CONVERSATION_CLOSING, CONVERSATION_SYSTEM } from "./prompts";

const Text = z.object({
  en: z.string().describe("English"),
  ar: z.string().describe("Modern Standard Arabic (Fusha), no dialect"),
});

/** What Gemini returns (structured output). */
const ModelTurn = z.object({
  briefUpdates: z
    .array(z.object({ field: z.enum(BRIEF_FIELDS), value: Text }))
    .describe("Every brief field the latest answer covers"),
  asking: z.enum([...BRIEF_FIELDS, "none"]).describe('The field the question asks about, or "none" when done'),
  question: Text,
  quickAnswers: z.array(z.object({ label: Text, value: Text })).max(4),
  keywords: z.array(Text).max(4),
  brandName: z.string().describe("The business's own name if the visitor said it (e.g. \"Bloom Coffee\"), else \"\""),
  done: z.boolean(),
});
type ModelTurn = z.infer<typeof ModelTurn>;

const L = config.limits;
const filled = (brief: Brief): BriefField[] => BRIEF_FIELDS.filter((f) => brief[f]);
const both = (t: Localized, max: number, ellipsis = false): Localized => ({
  en: fit(t.en, max, { ellipsis }),
  ar: fit(t.ar, max, { ellipsis }),
});

export async function nextTurn(input: ConversationRequest): Promise<ConversationTurn> {
  const { brief, history, lastAnswer, lang } = input;
  const visitorTurns = history.filter((h) => h.role === "visitor").length + (lastAnswer ? 1 : 0);
  const capped = visitorTurns >= config.maxTurns;

  const prompt = JSON.stringify(
    {
      uiLanguage: lang,
      briefSoFar: Object.fromEntries(filled(brief).map((f) => [f, brief[f]])),
      brandName: brief.brandName ?? "",
      missingFields: BRIEF_FIELDS.filter((f) => !brief[f]),
      conversationSoFar: history,
      latestAnswer: lastAnswer,
      turnsLeft: Math.max(0, config.maxTurns - visitorTurns),
    },
    null,
    1,
  );

  const out: ModelTurn = await generateJson({
    model: config.models.conversation,
    system: CONVERSATION_SYSTEM,
    prompt,
    schema: ModelTurn,
    thinking: ThinkingLevel.LOW,
    temperature: 0.6,
    check: (t) => {
      const known = new Set([...filled(brief), ...t.briefUpdates.map((u) => u.field)]);
      const missing = BRIEF_FIELDS.filter((f) => !known.has(f));
      if (missing.length === 0 && !t.done) return "All brief fields are known: set done=true with a closing line.";
      if (capped) return null;
      if (missing.length > 0 && t.done) return `Not done: still missing ${missing.join(", ")}.`;
      if (!t.done) {
        if (t.asking === "none" || known.has(t.asking)) return `"asking" must be a missing field: ${missing.join(", ")}.`;
        if (t.quickAnswers.length !== 4) return "Give exactly 4 quickAnswers.";
      }
      return null;
    },
  });

  // Apply updates (fit to the checklist slot).
  const briefUpdates: Brief = {};
  for (const u of out.briefUpdates) briefUpdates[u.field] = both(u.value, L.briefValue);
  const brandName = out.brandName.trim().replace(/^["“«]|["”»]$/g, "");
  if (brandName && !brief.brandName) briefUpdates.brandName = fit(brandName, L.brandName);
  const merged: Brief = { ...brief, ...briefUpdates };
  const missing = BRIEF_FIELDS.filter((f) => !merged[f]);
  const done = missing.length === 0 || capped;

  if (done) {
    const keywords = out.keywords.length
      ? out.keywords.map((k) => both(k, L.keyword))
      : [merged.location, merged.audience, merged.goal, merged.business].filter((v): v is Localized => !!v).map((k) => both(k, L.keyword));
    return {
      question: out.done ? both(out.question, L.question, true) : CONVERSATION_CLOSING,
      asking: null,
      quickAnswers: [],
      briefUpdates: { ...briefUpdates, keywords: keywords.slice(0, 4) },
      done: true,
    };
  }

  const asking = out.asking !== "none" && missing.includes(out.asking) ? out.asking : missing[0];
  return {
    question: both(out.question, L.question, true),
    asking,
    quickAnswers: out.quickAnswers.slice(0, 4).map((a, i) => ({
      id: `${asking}-${i}`,
      label: both(a.label, L.quickAnswer),
      value: both(a.value, L.briefValue),
    })),
    briefUpdates,
    done: false,
  };
}
