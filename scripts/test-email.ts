// Sends one EN and one AR strategy email (Bloom Coffee sample) to EMAIL_TEST_TO through the real
// /api/email route, printing each Resend id and latency.
// Needs the dev server (npm run dev) and RESEND_API_KEY, EMAIL_FROM, EMAIL_TEST_TO in .env.local.
// Usage: npm run test:email [-- --base http://localhost:3000]
import { existsSync } from "node:fs";
import { EXAMPLES } from "../lib/examples";
import { SAMPLE_STRATEGY } from "../lib/services/mock";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
  const to = process.env.EMAIL_TEST_TO;
  if (!to) {
    console.error("✗ EMAIL_TEST_TO is not set in .env.local");
    process.exit(1);
  }
  console.log(`MCG Try AI · test:email · ${base} → ${to}\n`);
  const run = Date.now().toString(36);
  for (const lang of ["en", "ar"] as const) {
    const t0 = performance.now();
    let res: Response;
    try {
      res = await fetch(`${base}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: to,
          name: lang === "ar" ? "سارة" : "Sara",
          consent: false,
          lang,
          strategy: SAMPLE_STRATEGY,
          brief: EXAMPLES.cafe,
          sessionId: `test-email-${run}`,
        }),
      });
    } catch (e) {
      console.error(`✗ cannot reach ${base} (is "npm run dev" running?): ${(e as Error).message}`);
      process.exit(1);
    }
    const json = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
    const ms = Math.round(performance.now() - t0);
    if (!res.ok || !json?.id) {
      console.error(`✗ ${lang.toUpperCase()} failed: HTTP ${res.status} ${JSON.stringify(json)} (${ms} ms)`);
      if (json?.error === "email_config") console.error("  → set RESEND_API_KEY and EMAIL_FROM (a verified Resend domain) in .env.local, then restart the dev server.");
      process.exit(1);
    }
    console.log(`✓ ${lang.toUpperCase()}  Resend id ${json.id}  (${ms} ms)`);
  }
  console.log("\nCheck the inbox: subject \"Your campaign strategy from MCG\" / \"استراتيجية حملتك من MCG\".");
  console.log("Images load from APP_URL; set it to the deployed URL, since localhost isn't reachable by mail clients.");
}

main();
