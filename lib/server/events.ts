import "server-only";
import { after } from "next/server";
import type { Lang } from "@/lib/i18n";
import { db } from "./db";

/** Anonymous usage events for the admin stats: the type, language and time only. */
export type EventType = "session_started" | "brief_completed" | "strategy_generated" | "email_sent";

/** Records an event after the response is sent; never slows down or fails the visitor's request. */
export function track(type: EventType, lang: Lang): void {
  const sql = db();
  if (!sql || process.env.LEADS_ENABLED === "false") return;
  after(async () => {
    try {
      await sql`INSERT INTO events (type, lang) VALUES (${type}, ${lang})`;
    } catch (e) {
      console.warn(`[events] ${type} not recorded: ${e instanceof Error ? e.message : e}`);
    }
  });
}
