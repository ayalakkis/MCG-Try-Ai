// Example card → CREATE → PREVIEW with a fake clock, capturing the 04 design state.
// Usage (dev server running): node scripts/e2e-create.mjs [en|ar]
import { chromium } from "@playwright/test";

const lang = process.argv[2] === "ar" ? "ar" : "en";
const example = lang === "ar" ? "عرض قهوة العصر" : "Café happy hour";
const startOver = lang === "ar" ? "من جديد" : "Start over";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(String(e)));

const report = async (label) => {
  const r = await p.evaluate(() => {
    const bar = document.querySelector("[role=progressbar]");
    const cur = document.querySelector("[aria-current=step]");
    return { progress: bar?.getAttribute("aria-valuenow"), active: cur?.textContent ?? null, body: document.body.innerText.split("\n").slice(-1)[0] };
  });
  console.log(label, JSON.stringify(r));
};

await p.clock.install();
await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
if (lang === "ar") await p.getByRole("button", { name: "عربي" }).click();
await p.getByRole("button", { name: example }).click();
for (const ms of [0, 5000, 9000, 7000]) {
  await p.clock.runFor(ms);
  await report(`t+${ms}ms`);
}
// Design state (t≈21 s): "The big idea" active, bar ≈58% as in the design's base width.
const cdp = await p.context().newCDPSession(p);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
await p.screenshot({ path: `screenshots-out/04-create-app${lang === "ar" ? "-ar" : ""}.png` });
await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
await report("screenshot at");

await p.clock.runFor(13_000);
await report("t≈34s");
await p.clock.runFor(2_500);
await report("t≈36.5s (should be preview)");

// Start over mid-create, then the next visitor starts from 0. (Start over also resets the language.)
const pickExample = async () => {
  if (lang === "ar") await p.getByRole("button", { name: "عربي" }).click();
  await p.getByRole("button", { name: example }).click();
};
await p.getByRole("button", { name: startOver }).click();
await pickExample();
await p.clock.runFor(8000);
await p.getByRole("button", { name: startOver }).click();
await pickExample();
await p.clock.runFor(400);
await report("after restart");
console.log("errors:", errs);
await b.close();
