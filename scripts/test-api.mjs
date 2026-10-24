// Runs the Bloom Coffee café brief through the real API, printing each step and its latency:
//   speak (TTS sample clip) → transcribe → conversation (turn by turn) → strategy → email.
// Needs the dev server (npm run dev) and GEMINI_API_KEY in .env.local. The email step runs when
// EMAIL_TEST_TO is set (plus RESEND_API_KEY / EMAIL_FROM on the server); --no-email skips it.
// Usage: npm run test:api [-- --ar] [-- --base http://localhost:3000] [-- --no-voice] [-- --no-email]
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const lang = args.includes("--ar") ? "ar" : "en";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
const L = { question: 72, quickAnswer: 22, briefValue: 20, keyword: 14, headline: 64 };

/** What the café owner says, by the field the AI asks about. */
const ANSWERS = {
  en: {
    first: "I have a specialty coffee shop called Bloom in Salmiya, and I want more people coming in the evenings.",
    business: "A specialty coffee shop.",
    goal: "More people in the evenings.",
    audience: "Young professionals, right after work.",
    location: "Salmiya.",
  },
  ar: {
    first: "عندي مقهى قهوة مختصة اسمه Bloom بالسالمية، وأبي ناس أكثر يجون بالمسا.",
    business: "مقهى قهوة مختصة.",
    goal: "أبي زوار أكثر بالمسا.",
    audience: "الموظفين الشباب، بعد الدوام على طول.",
    location: "السالمية.",
  },
}[lang];

const FIELDS = ["business", "goal", "audience", "location"];
const now = () => performance.now();
const line = (s = "") => console.log(s);
const timings = [];
const warnings = [];
const check = (ok, msg) => ok || warnings.push(msg);
const len = (s) => [...s.trim()].length;

async function request(path, init) {
  const t = now();
  let res;
  try {
    res = await fetch(base + path, init);
  } catch (e) {
    throw new Error(`cannot reach ${base} (is "npm run dev" running?): ${e.message}`);
  }
  const took = Math.round(now() - t);
  return { res, took };
}

async function post(path, body) {
  const { res, took } = await request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, took: `${took} ms`, ms: took };
}

function fail(step, r) {
  line(`\n✗ ${step} failed: HTTP ${r.status} ${JSON.stringify(r.json)} (${r.took})`);
  if (r.json?.error === "ai_config") line("  → GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.");
  if (r.json?.error === "email_config") line("  → RESEND_API_KEY / EMAIL_FROM missing on the server (or run with --no-email).");
  process.exit(1);
}

line(`MCG Try AI · test:api · ${base} · lang=${lang}\n`);

// ---- Voice: synthesize the first answer, then transcribe that clip ----
let firstAnswer = ANSWERS.first;
if (!args.includes("--no-voice")) {
  const { res, took } = await request("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ANSWERS.first, lang }) });
  if (!res.ok) fail("speak", { status: res.status, json: await res.json().catch(() => null), took: `${took} ms` });
  const wav = new Uint8Array(await res.arrayBuffer());
  const seconds = wav.length > 44 ? (wav.length - 44) / (24_000 * 2) : 0;
  timings.push(["speak", took]);
  line(`── Speak (TTS) · ${took} ms`);
  line(`   ${(wav.length / 1024).toFixed(1)} KB ${res.headers.get("content-type")}, ~${seconds.toFixed(1)} s of audio`);

  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "sample.wav");
  form.append("lang", lang);
  const t = await request("/api/transcribe", { method: "POST", body: form });
  const json = await t.res.json().catch(() => null);
  if (!t.res.ok) fail("transcribe", { status: t.res.status, json, took: `${t.took} ms` });
  timings.push(["transcribe", t.took]);
  line(`── Transcribe · ${t.took} ms`);
  line(`   said:  ${ANSWERS.first}`);
  line(`   heard: ${json.text}\n`);
  firstAnswer = json.text;
}

// ---- Conversation, turn by turn ----
let brief = {};
const history = [];
let lastAnswer = firstAnswer;
let asking = null;
for (let turn = 1; turn <= 8; turn++) {
  const r = await post("/api/conversation", { lang, brief, history, lastAnswer });
  if (r.status !== 200) fail(`conversation turn ${turn}`, r);
  timings.push([`conversation ${turn}`, r.ms]);
  const t = r.json;
  brief = { ...brief, ...t.briefUpdates };
  const filled = FIELDS.filter((f) => brief[f]);
  line(`── Turn ${turn} · ${r.took}`);
  line(`   visitor: ${lastAnswer}`);
  const updates = Object.entries(t.briefUpdates).filter(([k]) => k !== "keywords" && k !== "brandName");
  if (updates.length) line(`   brief +  ${updates.map(([k, v]) => `${k}=${v.en} / ${v.ar}`).join(" · ")}`);
  if (t.briefUpdates.brandName) line(`   brand    ${t.briefUpdates.brandName}`);
  line(`   brief    ${filled.length} / ${FIELDS.length}`);
  line(`   AI (en): ${t.question.en}`);
  line(`   AI (ar): ${t.question.ar}`);
  for (const k of ["en", "ar"]) check(len(t.question[k]) <= L.question, `turn ${turn} question (${k}) is ${len(t.question[k])} chars > ${L.question}`);
  if (t.quickAnswers.length) line(`   quick:   ${t.quickAnswers.map((a) => `${a.label.en} | ${a.label.ar}`).join("  ·  ")}`);
  if (!t.done) check(t.quickAnswers.length === 4, `turn ${turn} has ${t.quickAnswers.length} quick answers (want 4)`);
  if (t.done) {
    if (t.briefUpdates.keywords) line(`   keywords ${t.briefUpdates.keywords.map((k) => `${k.en} / ${k.ar}`).join(" · ")}`);
    line(`   ✓ done\n`);
    break;
  }
  if (lastAnswer) history.push({ role: "visitor", text: lastAnswer });
  history.push({ role: "ai", text: t.question.en });
  asking = t.asking;
  lastAnswer = ANSWERS[asking] ?? t.quickAnswers[0]?.label[lang];
  line("");
}

// ---- Strategy ----
const r = await post("/api/strategy", { lang, brief });
if (r.status !== 200) fail("strategy", r);
timings.push(["strategy", r.ms]);
const s = r.json;
const both = (x) => `${x.en}  |  ${x.ar}`;
line(`── Strategy · ${r.took}`);
const L2 = lang;
line(`   headline:    ${both(s.headline)}`);
line(`   summary:     ${s.summary[L2]}`);
line(`   parameters:  ${s.objective[L2]} · ${s.funnelStage[L2]} · ${s.audience[L2]}`);
for (const d of ["marketing", "socialMedia", "influencers", "event", "activation"]) line(`   ▸ ${d}: ${s[d].title[L2]}: ${s[d].idea[L2]}`);
line(`     platforms: ${s.socialMedia.platforms.map((x) => x.name[L2]).join(", ")}`);
line(`     creators:  ${s.influencers.mix[L2]} · event: ${s.event.when[L2]}`);
line(`     activation: ${s.activation.points.map((x) => x[L2]).join(" · ")}`);
line(`   ▸ budget: KWD ${s.budget.monthlyMin}–${s.budget.monthlyMax}/month · ${s.budget.split.map((x) => `${x.channel[L2]} ${x.percent}%`).join(", ")}`);
line(`   next step:   ${s.nextStep[L2]}`);
const sum = s.budget.split.reduce((n, x) => n + x.percent, 0);
check(sum === 100, `budget split adds up to ${sum}%, not 100%`);
check(s.budget.monthlyMin > 0 && s.budget.monthlyMax >= s.budget.monthlyMin, "budget range is invalid");
for (const k of ["en", "ar"]) {
  check(len(s.headline[k]) <= L.headline, `headline (${k}) ${len(s.headline[k])} > ${L.headline}`);
}
check(!/\b(doubl|tripl|guarantee|\d+\s?x\b|\d+\s?%)/i.test(s.objective.en + s.summary.en + s.headline.en), `strategy may promise results: "${s.objective.en}"`);

// ---- Email ----
const to = process.env.EMAIL_TEST_TO;
if (args.includes("--no-email") || !to) {
  line(`\n── Email · skipped${to ? "" : " (set EMAIL_TEST_TO in .env.local to include it)"}`);
} else {
  const e = await post("/api/email", { email: to, name: lang === "ar" ? "سارة" : "Sara", consent: false, lang, strategy: s, brief, sessionId: `test-api-${Date.now().toString(36)}` });
  if (e.status !== 200) fail("email", e);
  timings.push(["email", e.ms]);
  line(`\n── Email · ${e.took}`);
  line(`   sent to ${to}, Resend id ${e.json.id}`);
}

line(`\n── Latency`);
for (const [name, t] of timings) line(`   ${name.padEnd(16)} ${String(t).padStart(6)} ms`);
if (warnings.length) {
  line(`\n⚠ ${warnings.length} check(s) to review:`);
  for (const w of warnings) line(`   - ${w}`);
}
line(`\n✓ test:api OK`);
