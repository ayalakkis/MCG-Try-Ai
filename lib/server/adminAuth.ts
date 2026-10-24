import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin sign-in: one shared password (ADMIN_PASSWORD, server env only). A successful login sets an
 * httpOnly cookie holding an expiry signed with a key derived from the password, so changing the
 * password signs every admin out. No user table, nothing stored.
 */
export const ADMIN_COOKIE = "mcg_admin";
const SESSION_HOURS = 12;

const sha256 = (s: string) => createHash("sha256").update(s).digest();

function signingKey(): Buffer | null {
  const password = process.env.ADMIN_PASSWORD;
  return password ? sha256(`mcg-admin-session:${password}`) : null;
}

const sign = (key: Buffer, value: string) => createHmac("sha256", key).update(value).digest("base64url");

export const adminConfigured = () => !!process.env.ADMIN_PASSWORD;

/** Constant-time password check. */
export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(sha256(input), sha256(password));
}

/** A new session token: "<expiry ms>.<signature>". */
export function newSessionToken(): { token: string; maxAge: number } {
  const key = signingKey();
  if (!key) throw new Error("ADMIN_PASSWORD is not set");
  const exp = String(Date.now() + SESSION_HOURS * 3_600_000);
  return { token: `${exp}.${sign(key, exp)}`, maxAge: SESSION_HOURS * 3600 };
}

export function validToken(token: string | undefined): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** For server components and route handlers. */
export async function isAdmin(): Promise<boolean> {
  return validToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
