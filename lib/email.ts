/**
 * Email helpers for screen 06: the same rule as EmailAddressSchema on the server, plus the
 * inline hint ("Check the part after @") and a typo suggestion chip ("gmail.com?").
 */
import { EmailAddressSchema } from "./schemas";

/** Domain shortcut chips (06-email.html), also the domains we suggest when one is mistyped. */
export const DOMAIN_CHIPS = ["gmail.com", "outlook.com", "icloud.com"] as const;
const KNOWN = [...DOMAIN_CHIPS, "hotmail.com", "yahoo.com", "live.com", "me.com"];

export type EmailProblem = "missing-at" | "domain" | null;

export const isValidEmail = (value: string) => EmailAddressSchema.safeParse(value).success;

export function emailProblem(value: string): EmailProblem {
  const v = value.trim();
  if (!v || isValidEmail(v)) return null;
  return v.includes("@") ? "domain" : "missing-at";
}

/** Tapping "@gmail.com" appends it, or replaces whatever already follows the @. */
export function withDomain(value: string, domain: string): string {
  const v = value.trim();
  const at = v.indexOf("@");
  return `${at >= 0 ? v.slice(0, at) : v}@${domain}`;
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** "sara@gmail" → "gmail.com", "sara@gmial.com" → "gmail.com"; null when nothing is close. */
export function suggestDomain(value: string): string | null {
  const at = value.lastIndexOf("@");
  if (at < 1) return null;
  const domain = value.slice(at + 1).trim().toLowerCase();
  if (!domain || KNOWN.includes(domain)) return null;
  const bare = domain.replace(/\.+$/, "");
  const byName = KNOWN.find((k) => k.split(".")[0] === bare);
  if (byName) return byName;
  let best: string | null = null;
  let bestD = 3;
  for (const k of KNOWN) {
    const dist = Math.min(distance(bare, k), distance(bare, k.split(".")[0]));
    if (dist < bestD) [best, bestD] = [k, dist];
  }
  return best;
}
