import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { Lang } from "@/lib/i18n";
import type { Brief, Localized } from "@/lib/services/types";
import { db } from "./db";

/**
 * Every visitor who got a plan, with or without an email: the brief and the strategy name only
 * (no name, email or audio). Written after the response so the visitor never waits for it.
 */
export function recordSession(sessionId: string | undefined, lang: Lang, brief: Brief, strategyName: Localized): void {
  const sql = db();
  if (!sql || process.env.LEADS_ENABLED === "false") return;
  const { keywords: _keywords, ...stored } = brief;
  after(async () => {
    try {
      await sql`
        INSERT INTO sessions (session_id, lang, brief, strategy_name)
        VALUES (${sessionId || randomUUID()}, ${lang}, ${JSON.stringify(stored)}::jsonb, ${JSON.stringify(strategyName)}::jsonb)
        ON CONFLICT (session_id) DO UPDATE SET brief = EXCLUDED.brief, strategy_name = EXCLUDED.strategy_name`;
    } catch (e) {
      console.warn(`[sessions] not recorded: ${e instanceof Error ? e.message : e}`);
    }
  });
}

/** The visitor's plan went out by email. */
export function markEmailed(sessionId: string | undefined): void {
  const sql = db();
  if (!sql || !sessionId || process.env.LEADS_ENABLED === "false") return;
  after(async () => {
    try {
      await sql`UPDATE sessions SET emailed = true WHERE session_id = ${sessionId}`;
    } catch (e) {
      console.warn(`[sessions] emailed flag not saved: ${e instanceof Error ? e.message : e}`);
    }
  });
}
