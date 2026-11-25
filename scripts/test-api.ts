// Runs one example brief through the real API the way the booth does, printing each step and its latency:
//   speak (the Email screen's spoken line) → strategy → email.
// Needs the dev server (npm run dev) and GEMINI_API_KEY in .env.local. The email step runs when
// EMAIL_TEST_TO is set (plus Gmail or Resend configured on the server); --no-email skips it.
// Usage: npm run test:api [-- --ar] [-- --brief cafe|ramadan|online] [-- --base http://localhost:3000]
//                         [-- --no-voice] [-- --no-email]
import { existsSync } from "node:fs";
import { config } from "../lib/config";
import { EXAMPLES, type ExampleId } from "../lib/examples";
import { t as dict } from "../lib/i18n";
import type { Localized, Strategy } from "../lib/services/types";

type Json = Record<string, unknown> | null;

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const lang = args.includes("--ar") ? "ar" : "en";
  const base = opt("--base") ?? "http://localhost:3000";
  const briefId = (opt("--brief") ?? "cafe") as ExampleId;
  const brief = EXAMPLES[briefId];
  if (!brief) {
    console.error(`✗ unknown --brief "${briefId}" (use ${Object.keys(EXAMPLES).join(", ")})`);
    process.exit(1);
  }
  const sessionId = `test-api-${Date.now().toString(36)}`;

  const line = (s = "") => console.log(s);
  const timings: [string, number][] = [];
  const warnings: string[] = [];
  const len = (s: string) => [...s.trim()].length;
  /** Warns when a field is longer than its designed slot (config.limits), in either language. */
  const fits = (label: string, value: Localized, max: number) => {
    for (const k of ["en", "ar"] as const) {
      if (len(value[k]) > max) warnings.push(`${label} (${k}) is ${len(value[k])} chars > ${max}`);
    }
  };

  async function request(path: string, init: RequestInit) {
    const t0 = performance.now();
    let res: Response;
    try {
      res = await fetch(base + path, init);
    } catch (e) {
      line(`✗ cannot reach ${base} (is "npm run dev" running?): ${(e as Error).message}`);
      process.exit(1);
    }
    return { res, ms: Math.round(performance.now() - t0) };
  }

  async function post(path: string, body: unknown) {
    const { res, ms } = await request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as Json;
    return { status: res.status, json, ms };
  }

  function fail(step: string, r: { status: number; json: Json; ms: number }): never {
    line(`\n✗ ${step} failed: HTTP ${r.status} ${JSON.stringify(r.json)} (${r.ms} ms)`);
    if (r.json?.error === "ai_config") line("  → GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.");
    if (r.json?.error === "email_config")
      line("  → Email isn't set up on the server: GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY + EMAIL_FROM (or run with --no-email).");
    process.exit(1);
  }

  line(`MCG Try AI · test:api · ${base} · lang=${lang} · brief=${briefId}\n`);
  const show = (k: keyof typeof brief) => {
    const v = brief[k];
    return typeof v === "object" && v && "en" in v ? v[lang] : String(v ?? "");
  };
  line(`── Brief`);
  for (const k of ["brandName", "business", "audience", "goal", "challenge", "location"] as const) line(`   ${k.padEnd(10)} ${show(k)}`);
  line("");

  // ---- Voice: the line the AI says on the Email screen ----
  if (!args.includes("--no-voice")) {
    const text = dict(lang).email.spoken;
    const { res, ms } = await request("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (!res.ok) fail("speak", { status: res.status, json: (await res.json().catch(() => null)) as Json, ms });
    const wav = new Uint8Array(await res.arrayBuffer());
    const seconds = wav.length > 44 ? (wav.length - 44) / (24_000 * 2) : 0;
    timings.push(["speak", ms]);
    line(`── Speak (TTS) · ${ms} ms`);
    line(`   "${text}"`);
    line(`   ${(wav.length / 1024).toFixed(1)} KB ${res.headers.get("content-type")}, ~${seconds.toFixed(1)} s of audio\n`);
  }

  // ---- Strategy ----
  const r = await post("/api/strategy", { lang, brief, sessionId });
  if (r.status !== 200) fail("strategy", r);
  timings.push(["strategy", r.ms]);
  const s = r.json as unknown as Strategy;
  const L = config.limits;
  line(`── Strategy · ${r.ms} ms`);
  line(`   headline:    ${s.headline.en}  |  ${s.headline.ar}`);
  line(`   summary:     ${s.summary[lang]}`);
  line(`   parameters:  ${s.objective[lang]} · ${s.funnelStage[lang]} · ${s.audience[lang]}`);
  for (const d of ["marketing", "socialMedia", "influencers", "event", "activation"] as const) {
    line(`   ▸ ${d}: ${s[d].title[lang]}: ${s[d].idea[lang]}`);
    fits(`${d} title`, s[d].title, L.cardTitle);
    fits(`${d} idea`, s[d].idea, L.cardIdea);
  }
  line(`     platforms:  ${s.socialMedia.platforms.map((x) => x.name[lang]).join(", ")}`);
  line(`     creators:   ${s.influencers.mix[lang]} · event: ${s.event.when[lang]}`);
  line(`     activation: ${s.activation.points.map((x) => x[lang]).join(" · ")}`);
  line(`   next step:   ${s.nextStep[lang]}`);
  if (s.keywords.length) line(`   keywords:    ${s.keywords.map((k) => k[lang]).join(" · ")}`);

  fits("headline", s.headline, L.headline);
  fits("summary", s.summary, L.summary);
  for (const k of ["objective", "funnelStage", "audience"] as const) fits(k, s[k], L.parameter);
  for (const p of s.socialMedia.platforms) {
    fits("platform name", p.name, L.platformName);
    fits("platform role", p.role, L.platformRole);
  }
  fits("influencer mix", s.influencers.mix, L.influencerMix);
  fits("event when", s.event.when, L.eventWhen);
  for (const d of ["marketing", "influencers", "event", "activation"] as const) for (const p of s[d].points) fits(`${d} point`, p, L.point);
  for (const p of s.activation.offers) fits("activation offer", p, L.point);
  fits("next step", s.nextStep, L.nextStep);
  for (const k of s.keywords) fits("keyword", k, L.keyword);
  if (/\b(doubl|tripl|guarantee|\d+\s?x\b|\d+\s?%)/i.test(s.objective.en + s.summary.en + s.headline.en)) {
    warnings.push(`strategy may promise results: "${s.objective.en}"`);
  }

  // ---- Email ----
  const to = process.env.EMAIL_TEST_TO;
  if (args.includes("--no-email") || !to) {
    line(`\n── Email · skipped${to ? "" : " (set EMAIL_TEST_TO in .env.local to include it)"}`);
  } else {
    const e = await post("/api/email", { email: to, name: lang === "ar" ? "سارة" : "Sara", consent: false, lang, strategy: s, brief, sessionId });
    if (e.status !== 200) fail("email", e);
    timings.push(["email", e.ms]);
    line(`\n── Email · ${e.ms} ms`);
    line(`   sent to ${to}, message id ${e.json?.id}`);
  }

  line(`\n── Latency`);
  for (const [name, ms] of timings) line(`   ${name.padEnd(10)} ${String(ms).padStart(6)} ms`);
  if (warnings.length) {
    line(`\n⚠ ${warnings.length} check(s) to review:`);
    for (const w of warnings) line(`   - ${w}`);
  }
  line(`\n✓ test:api OK`);
}

main();
