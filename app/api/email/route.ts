import { config } from "@/lib/config";
import { EmailRequestSchema, EmailResponseSchema } from "@/lib/schemas";
import { sendStrategyEmail } from "@/lib/server/email";
import { track } from "@/lib/server/events";
import { markEmailed } from "@/lib/server/sessions";
import { fail, HttpError, limit, ok } from "@/lib/server/http";

export const runtime = "nodejs";
/** Rendering + 25 s per Resend attempt + 1 retry. */
export const maxDuration = 60;

/**
 * POST { email, name?, consent, lang, strategy, brief, sessionId? } → { ok, id }.
 * Renders the EN or AR template and sends it via Resend. Limited per IP and per address.
 */
export async function POST(req: Request) {
  try {
    limit(req, "email", config.rateLimit.email);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const parsed = EmailRequestSchema.safeParse(body);
    if (!parsed.success) {
      // A bad address gets the inline "Check the part after @" state; anything else is a bug.
      const badEmail = parsed.error.issues.some((i) => i.path[0] === "email");
      throw new HttpError(400, badEmail ? "invalid_email" : "invalid_input", badEmail ? "invalid-email" : "reconnecting");
    }
    const input = parsed.data;
    // The team's own test inbox (EMAIL_TEST_TO) is exempt from the per-address limit.
    const address = input.email.toLowerCase();
    if (address !== process.env.EMAIL_TEST_TO?.trim().toLowerCase()) {
      limit(req, "email-address", config.rateLimit.emailPerAddress, address);
    }
    const id = await sendStrategyEmail(input);
    track("email_sent", input.lang);
    markEmailed(input.sessionId);
    return ok(EmailResponseSchema, { ok: true, id });
  } catch (e) {
    return fail(e);
  }
}
