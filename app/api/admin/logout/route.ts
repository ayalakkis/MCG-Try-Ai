import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

/** POST → clears the admin cookie (relative redirect: works on any host). */
export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin/login" } });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
