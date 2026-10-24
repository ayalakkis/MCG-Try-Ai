import { NextResponse } from "next/server";
import { getLeads, isRange, leadsCsv } from "@/lib/server/admin";
import { isAdmin } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET ?q=&range= → leads as CSV (admins only). */
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const range = new URL(req.url).searchParams.get("range");
  const leads = (await getLeads(isRange(range) ? range : "all", q, 10_000)) ?? [];
  const date = new Date().toISOString().slice(0, 10);
  return new Response(leadsCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mcg-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
