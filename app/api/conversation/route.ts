import { config } from "@/lib/config";
import { ConversationRequestSchema, ConversationTurnSchema } from "@/lib/schemas";
import { nextTurn } from "@/lib/server/conversation";
import { track } from "@/lib/server/events";
import { fail, limit, ok, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
/** 25 s per Gemini attempt + 1 retry. */
export const maxDuration = 60;

/** POST { lang, brief, history, lastAnswer } → next question, quick answers, brief updates, done. */
export async function POST(req: Request) {
  try {
    limit(req, "conversation", config.rateLimit.conversation);
    const input = await readJson(req, ConversationRequestSchema);
    const turn = await nextTurn(input);
    if (input.history.length === 0) track("session_started", input.lang);
    if (turn.done) track("brief_completed", input.lang);
    return ok(ConversationTurnSchema, turn);
  } catch (e) {
    return fail(e);
  }
}
