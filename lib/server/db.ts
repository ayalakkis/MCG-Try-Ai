import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | null | undefined;

/** Neon Postgres over HTTP, or null when DATABASE_URL isn't set (storage off). */
export function db(): NeonQueryFunction<false, false> | null {
  if (sql === undefined) sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return sql;
}
