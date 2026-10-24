// Runs one brief through lib/server/strategy.ts with the model in GEMINI_STRATEGY_MODEL and
// prints the result + latency, to compare strategy models or check the prompt.
// Usage: GEMINI_STRATEGY_MODEL=gemini-3.8-flash npx tsx --conditions react-server scripts/compare-strategy.ts [ar] [cafe|ramadan|online]
import { existsSync } from "node:fs";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const lang = process.argv.includes("ar") ? "ar" : "en";
  const id = (["ramadan", "online"].find((x) => process.argv.includes(x)) ?? "cafe") as "cafe" | "ramadan" | "online";
  const { EXAMPLES } = await import("../lib/examples");
  const { generateStrategy } = await import("../lib/server/strategy");
  const t0 = performance.now();
  const s = await generateStrategy({ lang, brief: EXAMPLES[id] });
  const ms = Math.round(performance.now() - t0);
  const L = (x: { en: string; ar: string }) => `${x.en}  |  ${x.ar}`;
  console.log(`=== ${process.env.GEMINI_STRATEGY_MODEL ?? "default model"} · ${id} · ${lang} · ${ms} ms`);
  console.log(`headline:   ${L(s.headline)}\nsummary:    ${L(s.summary)}`);
  console.log(`parameters: ${s.objective.en} · ${s.funnelStage.en} · ${s.audience.en}`);
  for (const d of ["marketing", "socialMedia", "influencers", "event", "activation"] as const) {
    console.log(`\n[${d}] ${L(s[d].title)}\n  ${s[d].idea.en}\n  ${s[d].idea.ar}`);
  }
  console.log(`  platforms: ${s.socialMedia.platforms.map((p) => `${p.name.en}: ${p.role.en}`).join(" / ")}`);
  console.log(`  influencer mix: ${L(s.influencers.mix)}; event when: ${L(s.event.when)}`);
  console.log(`  how it runs: ${s.activation.points.map((p) => p.en).join(" / ")}`);
  console.log(`  offers: ${s.activation.offers.map((o) => o.en).join(" / ")}`);
  console.log(`\n[budget] KWD ${s.budget.monthlyMin}–${s.budget.monthlyMax}/month: ${s.budget.split.map((x) => `${x.channel.en} ${x.percent}%`).join(", ")}\n  ${L(s.budget.note)}`);
  console.log(`\nnext step: ${L(s.nextStep)}`);
}
main().catch((e) => {
  console.error("FAILED", e?.message ?? e);
  process.exit(1);
});
