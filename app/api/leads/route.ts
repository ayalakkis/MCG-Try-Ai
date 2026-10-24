import { config } from "@/lib/config";
import { LeadRequestSchema, LeadResponseSchema } from "@/lib/schemas";
import { fail, limit, ok, readJson } from "@/lib/server/http";
import { leadStore } from "@/lib/server/leads";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST { sessionId, email, name?, consent, lang, brief, strategyName } → { ok, saved }.
 * Called after a successful email send. Stored only when consent is true and storage is on.
 */
export async function POST(req: Request) {
  try {
    limit(req, "leads", config.rateLimit.leads);
    const lead = await readJson(req, LeadRequestSchema);
    const store = leadStore();
    const saved = lead.consent && store.enabled ? await store.save(lead) : false;
    return ok(LeadResponseSchema, { ok: true, saved });
  } catch (e) {
    return fail(e);
  }
}
