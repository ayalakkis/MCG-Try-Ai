import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, newSessionToken } from "@/lib/server/adminAuth";
import { clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** Relative redirect: works on localhost, a LAN IP (phone testing) or any deployed domain. */
const goTo = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

/** Max wrong or right attempts per IP per 15 minutes (slows down password guessing). */
const LOGIN_LIMIT = { limit: 8, windowMs: 15 * 60_000 };

/** POST form { password } → sets the admin cookie and goes to /admin, or back to the login page. */
export async function POST(req: Request) {
  const back = (error: string) => goTo(`/admin/login?error=${error}`);
  if (!rateLimit(`admin-login:${clientIp(req)}`, LOGIN_LIMIT).ok) return back("rate");

  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  if (typeof password !== "string" || !checkPassword(password)) return back("wrong");

  const { token, maxAge } = newSessionToken();
  const res = goTo("/admin");
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge });
  return res;
}
