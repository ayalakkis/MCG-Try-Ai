import "server-only";
import { BRIEF_FIELDS } from "@/lib/schemas";
import type { Brief, Localized } from "@/lib/services/types";
import { db } from "./db";
import type { EventType } from "./events";

/** Days and "today" are counted in Kuwait time. */
const TZ = "Asia/Kuwait";

export const RANGES = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
} as const;
export type Range = keyof typeof RANGES;
export const isRange = (v: unknown): v is Range => typeof v === "string" && v in RANGES;

/** Start of the range as an ISO timestamp (null = all time). */
function since(range: Range): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    // Midnight in Kuwait (UTC+3, no DST).
    const k = new Date(now.getTime() + 3 * 3_600_000);
    return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3 * 3_600_000).toISOString();
  }
  return new Date(now.getTime() - (range === "7d" ? 7 : 30) * 86_400_000).toISOString();
}

const ZERO: Record<EventType, number> = { session_started: 0, brief_completed: 0, strategy_generated: 0, email_sent: 0 };

export interface DayCounts {
  day: string;
  counts: Record<EventType, number>;
}

export interface Ranked {
  label: string;
  count: number;
}

export interface Overview {
  totals: Record<EventType, number>;
  byLang: { en: number; ar: number };
  leads: number;
  sessions: number;
  days: DayCounts[];
  topBusinesses: Ranked[];
  topAreas: Ranked[];
  topGoals: Ranked[];
  topAudiences: Ranked[];
  /** Demo rows exist (npm run db:demo). */
  demo: boolean;
}

export async function getOverview(range: Range): Promise<Overview | null> {
  const sql = db();
  if (!sql) return null;
  const from = since(range);
  // Daily chart: at least the last 14 days, so a short range still shows a trend.
  const chartFrom = from && range !== "today" ? from : new Date(Date.now() - 14 * 86_400_000).toISOString();
  const top = (field: string) => sql`
    SELECT initcap(lower(trim(brief->${field}->>'en'))) AS label, count(*)::int AS count
    FROM sessions WHERE (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz) AND brief->${field}->>'en' IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 6`;
  const [totals, perDay, leads, sessions, demo, biz, areas, goals, audiences] = await Promise.all([
    sql`SELECT type, lang, count(*)::int AS n FROM events
        WHERE ${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz GROUP BY type, lang`,
    sql`SELECT to_char(created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day, type, count(*)::int AS n
        FROM events WHERE created_at >= ${chartFrom}::timestamptz GROUP BY 1, 2 ORDER BY 1`,
    sql`SELECT count(*)::int AS n FROM leads WHERE ${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz`,
    sql`SELECT count(*)::int AS n FROM sessions WHERE ${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz`,
    sql`SELECT (EXISTS (SELECT 1 FROM events WHERE demo) OR EXISTS (SELECT 1 FROM sessions WHERE demo) OR EXISTS (SELECT 1 FROM leads WHERE demo)) AS any`,
    top("business"),
    top("location"),
    top("goal"),
    top("audience"),
  ]);
  const t = { ...ZERO };
  const byLang = { en: 0, ar: 0 };
  for (const r of totals as { type: EventType; lang: "en" | "ar"; n: number }[]) {
    t[r.type] += r.n;
    if (r.type === "session_started") byLang[r.lang] += r.n;
  }
  const map = new Map<string, Record<EventType, number>>();
  for (const r of perDay as { day: string; type: EventType; n: number }[]) {
    const c = map.get(r.day) ?? { ...ZERO };
    c[r.type] = r.n;
    map.set(r.day, c);
  }
  const n = (rows: unknown) => (rows as { n: number }[])[0]?.n ?? 0;
  return {
    totals: t,
    byLang,
    leads: n(leads),
    sessions: n(sessions),
    days: [...map].map(([day, counts]) => ({ day, counts })),
    topBusinesses: biz as Ranked[],
    topAreas: areas as Ranked[],
    topGoals: goals as Ranked[],
    topAudiences: audiences as Ranked[],
    demo: !!(demo as { any: boolean }[])[0]?.any,
  };
}

/* ---------- sessions (everyone who got a plan) ---------- */

export interface Session {
  id: number;
  createdAt: string;
  lang: "en" | "ar";
  brief: Brief;
  strategyName: Localized;
  emailed: boolean;
  lead: boolean;
}

const likeOf = (q: string) => `%${q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

export async function getSessions(range: Range, q = "", limit = 300): Promise<Session[] | null> {
  const sql = db();
  if (!sql) return null;
  const from = since(range);
  const like = likeOf(q);
  const rows = (await sql`
    SELECT s.id, s.created_at, s.lang, s.brief, s.strategy_name, s.emailed, (l.id IS NOT NULL) AS lead
    FROM sessions s LEFT JOIN LATERAL (SELECT id FROM leads WHERE leads.session_id = s.session_id LIMIT 1) l ON true
    WHERE (${from}::timestamptz IS NULL OR s.created_at >= ${from}::timestamptz)
      AND (${q.trim()} = '' OR s.brief::text ILIKE ${like} OR s.strategy_name::text ILIKE ${like})
    ORDER BY s.created_at DESC LIMIT ${limit}`) as {
    id: string;
    created_at: string;
    lang: "en" | "ar";
    brief: Brief;
    strategy_name: Localized;
    emailed: boolean;
    lead: boolean;
  }[];
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: new Date(r.created_at).toISOString(),
    lang: r.lang,
    brief: r.brief,
    strategyName: r.strategy_name,
    emailed: r.emailed,
    lead: r.lead,
  }));
}

/* ---------- leads (asked MCG to contact them) ---------- */

export interface Lead {
  id: number;
  createdAt: string;
  name: string | null;
  email: string;
  lang: "en" | "ar";
  brief: Brief;
  strategyName: Localized;
}

/** Newest first; `q` matches name, email, brief or strategy name. */
export async function getLeads(range: Range = "all", q = "", limit = 500): Promise<Lead[] | null> {
  const sql = db();
  if (!sql) return null;
  const from = since(range);
  const like = likeOf(q);
  const rows = (await sql`
    SELECT id, created_at, name, email, lang, brief, strategy_name FROM leads
    WHERE (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz)
      AND (${q.trim()} = '' OR name ILIKE ${like} OR email ILIKE ${like} OR brief::text ILIKE ${like} OR strategy_name::text ILIKE ${like})
    ORDER BY created_at DESC LIMIT ${limit}`) as {
    id: string;
    created_at: string;
    name: string | null;
    email: string;
    lang: "en" | "ar";
    brief: Brief;
    strategy_name: Localized;
  }[];
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: new Date(r.created_at).toISOString(),
    name: r.name,
    email: r.email,
    lang: r.lang,
    brief: r.brief,
    strategyName: r.strategy_name,
  }));
}

/** Kuwait-time "2026-10-19 21:04". */
export function kuwaitTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso))
    .replace(/(\d+)\/(\d+)\/(\d+),? /, "$3-$2-$1 ");
}

/** CSV for Excel: UTF-8 BOM (keeps Arabic readable), one row per lead, brief fields in EN and AR. */
export function leadsCsv(leads: Lead[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Quote everything; neutralise spreadsheet formulas.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const head = ["Date (Kuwait)", "Name", "Email", "Language", "Strategy (EN)", "Strategy (AR)", ...BRIEF_FIELDS.flatMap((f) => [`${f} (EN)`, `${f} (AR)`]), "Brand"];
  const rows = leads.map((l) => [
    kuwaitTime(l.createdAt),
    l.name,
    l.email,
    l.lang,
    l.strategyName.en,
    l.strategyName.ar,
    ...BRIEF_FIELDS.flatMap((f) => [l.brief[f]?.en, l.brief[f]?.ar]),
    l.brief.brandName,
  ]);
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
