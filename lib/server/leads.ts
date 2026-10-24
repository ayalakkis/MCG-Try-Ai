import "server-only";
import type { LeadRequest } from "@/lib/schemas";
import { db } from "./db";

/** Where consented leads go. Swap implementations without touching the route. */
export interface LeadStore {
  readonly enabled: boolean;
  /** Returns true when a new row was written (false = duplicate or storage off). */
  save(lead: LeadRequest): Promise<boolean>;
}

/** Local/dev default: nothing is stored. */
class NoopLeadStore implements LeadStore {
  readonly enabled = false;
  async save() {
    return false;
  }
}

/** Postgres through Vercel's Neon integration (DATABASE_URL), over Neon's HTTP driver. */
class PostgresLeadStore implements LeadStore {
  readonly enabled = true;
  constructor(private sql: NonNullable<ReturnType<typeof db>>) {}

  async save(lead: LeadRequest) {
    const rows = await this.sql`
      INSERT INTO leads (session_id, email, name, consent, lang, brief, strategy_name)
      VALUES (${lead.sessionId}, ${lead.email.toLowerCase()}, ${lead.name ?? null}, ${lead.consent}, ${lead.lang},
              ${JSON.stringify(lead.brief)}::jsonb, ${JSON.stringify(lead.strategyName)}::jsonb)
      ON CONFLICT (session_id, email) DO NOTHING
      RETURNING id`;
    return rows.length > 0;
  }
}

let store: LeadStore | null = null;

/** Postgres when DATABASE_URL is set and LEADS_ENABLED isn't "false"; otherwise off. */
export function leadStore(): LeadStore {
  if (store) return store;
  const sql = db();
  store = sql && process.env.LEADS_ENABLED !== "false" ? new PostgresLeadStore(sql) : new NoopLeadStore();
  return store;
}
