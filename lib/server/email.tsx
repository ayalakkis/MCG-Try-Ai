import "server-only";
import { render } from "@react-email/components";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";
import StrategyEmail from "@/emails/StrategyEmail";
import StrategyEmailAr from "@/emails/StrategyEmailAr";
import { EMAIL_IMAGES } from "@/emails/StrategyEmailBase";
import { config } from "@/lib/config";
import { t as dict } from "@/lib/i18n";
import type { EmailRequest } from "@/lib/schemas";
import { HttpError } from "./http";

/** Public origin for the logo and icons in the email (must be reachable by mail clients). */
export function appUrl(): string {
  const url =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Mail clients only load images from a public URL. Until the app is deployed (no APP_URL,
 * localhost or a LAN IP), the logo and icons are embedded in the email as inline attachments.
 * EMAIL_EMBED_IMAGES=true|false overrides.
 */
function embedImages(url: string): boolean {
  if (process.env.EMAIL_EMBED_IMAGES) return process.env.EMAIL_EMBED_IMAGES === "true";
  try {
    const { protocol, hostname } = new URL(url);
    return protocol !== "https:" || hostname === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  } catch {
    return true;
  }
}

function inlineImages() {
  return Object.entries(EMAIL_IMAGES).map(([path, contentId]) => ({
    filename: path.split("/").pop(),
    content: readFileSync(join(process.cwd(), "public", path)),
    contentId,
  }));
}

/** Renders the template for the visitor's language: HTML + plain-text part (+ inline images when embedded). */
export async function renderStrategyEmail(req: Pick<EmailRequest, "lang" | "strategy" | "brief" | "name">) {
  const embed = embedImages(appUrl());
  const props = { strategy: req.strategy, brief: req.brief, name: req.name, appUrl: embed ? "cid:" : appUrl() };
  const element = req.lang === "ar" ? <StrategyEmailAr {...props} /> : <StrategyEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text, subject: dict(req.lang).mail.subject, attachments: embed ? inlineImages() : undefined };
}

let client: Resend | null = null;

/**
 * Sends the strategy via Resend from EMAIL_FROM. 25 s timeout per attempt + 1 retry; the
 * idempotency key (visitor session + address) makes the retry, and any client-side retry,
 * deliver at most one email. Returns the Resend id.
 */
export async function sendStrategyEmail(req: EmailRequest): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("[email] RESEND_API_KEY and EMAIL_FROM must be set (.env.local)");
    throw new HttpError(500, "email_config");
  }
  client ??= new Resend(key);
  const { html, text, subject, attachments } = await renderStrategyEmail(req);
  const to = req.email.trim();
  const idempotencyKey = `strategy/${createHash("sha256").update(`${req.sessionId ?? req.strategy.id}:${to.toLowerCase()}:${req.lang}`).digest("hex").slice(0, 40)}`;

  let last: HttpError = new HttpError(502, "email_upstream");
  for (let attempt = 0; attempt <= config.ai.retries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HttpError(504, "email_timeout")), config.ai.timeoutMs);
      });
      const res = await Promise.race([
        client.emails.send(
          { from, to, subject, html, text, attachments, replyTo: process.env.EMAIL_REPLY_TO || undefined, tags: [{ name: "lang", value: req.lang }] },
          { idempotencyKey },
        ),
        timeout,
      ]);
      if (res.data?.id) return res.data.id;
      const err = res.error;
      const msg = err?.message ?? "no id returned";
      console.warn(`[email] attempt ${attempt + 1}: ${err?.name ?? "unknown"}: ${msg}`);
      // Test sender (onboarding@resend.dev) or unverified domain: only the account owner can receive.
      if (/testing emails|verify a domain|domain is not verified/i.test(msg)) {
        console.error(`[email] Resend refused the sender: ${msg}
  → verify a domain in Resend and set EMAIL_FROM to an address on it.`);
        throw new HttpError(500, "email_config");
      }
      // The address itself was refused: show the inline invalid-email state, don't retry.
      if (err?.name === "validation_error" && /\bto\b|recipient|email address/i.test(msg) && !/from/i.test(msg)) {
        throw new HttpError(422, "email_rejected", "invalid-email");
      }
      if (err?.name && ["missing_api_key", "invalid_api_key", "restricted_api_key", "invalid_from_address"].includes(err.name)) {
        console.error(`[email] configuration problem: ${msg}`);
        throw new HttpError(500, "email_config");
      }
      last = new HttpError(err?.name === "rate_limit_exceeded" ? 429 : 502, "email_upstream");
    } catch (e) {
      if (e instanceof HttpError && (e.state === "invalid-email" || e.code === "email_config")) throw e;
      last = e instanceof HttpError ? e : new HttpError(502, "email_upstream");
      console.warn(`[email] attempt ${attempt + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last;
}
