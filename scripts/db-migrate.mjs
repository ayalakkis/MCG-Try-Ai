// Applies db/migrations/*.sql in order, once each (tracked in schema_migrations).
// Usage: npm run db:migrate   (needs DATABASE_URL in .env.local, e.g. from `vercel env pull`)
import { neon } from "@neondatabase/serverless";
import { existsSync, readdirSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set (.env.local)");
  process.exit(1);
}
const sql = neon(url);
await sql.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
const done = new Set((await sql.query("SELECT name FROM schema_migrations")).map((r) => r.name));
const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  if (done.has(file)) {
    console.log(`· ${file} (already applied)`);
    continue;
  }
  // The HTTP driver runs one statement per query: split on semicolons at line ends.
  const statements = readFileSync(`db/migrations/${file}`, "utf8")
    .replace(/--.*$/gm, "")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const s of statements) await sql.query(s);
  await sql.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
  console.log(`✓ ${file}`);
}
console.log("migrations up to date");
