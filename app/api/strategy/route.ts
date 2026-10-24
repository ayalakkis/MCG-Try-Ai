import { config } from "@/lib/config";
import { StrategyRequestSchema, StrategySchema } from "@/lib/schemas";
import { fail, limit, ok, readJson } from "@/lib/server/http";
import { track } from "@/lib/server/events";
import { recordSession } from "@/lib/server/sessions";
import { generateStrategy } from "@/lib/server/strategy";

export const runtime = "nodejs";
/** 25 s per attempt + 1 retry, plus one short "shorten" pass for overflowing preview slots. */
export const maxDuration = 90;

/** POST { lang, brief } → full validated strategy (preview fields sized to the designed slots). */
export async function POST(req: Request) {
  try {
    limit(req, "strategy", config.rateLimit.strategy);
    const input = await readJson(req, StrategyRequestSchema);
    const strategy = await generateStrategy(input);
    track("strategy_generated", input.lang);
    recordSession(input.sessionId, input.lang, input.brief, strategy.headline);
    return ok(StrategySchema, strategy);
  } catch (e) {
    return fail(e);
  }
}
