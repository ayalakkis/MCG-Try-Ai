// Example card → CREATE → PREVIEW (fake clock), captures the 05 design state, then checks both actions.
// Usage (dev server running): node scripts/e2e-preview.mjs [en|ar]
import { chromium } from "@playwright/test";

const lang = process.argv[2] === "ar" ? "ar" : "en";
const T = {
  en: { example: "Café happy hour", email: "Email me the full strategy", notNow: "Not now", hold: "Hold to talk" },
  ar: { example: "عرض قهوة العصر", email: "أرسلوا لي الاستراتيجية كاملة", notNow: "مو الحين", hold: "اضغط مطوّل وتكلّم" },
}[lang];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(String(e)));

const toPreview = async () => {
  if (lang === "ar") await p.getByRole("button", { name: "عربي" }).click();
  await p.getByRole("button", { name: T.example }).click();
  await p.clock.runFor(37_000);
};

await p.clock.install();
await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await toPreview();
console.log("h1:", await p.locator("h1").textContent());
await p.clock.runFor(5_000); // let the spoken intro finish
const cdp = await p.context().newCDPSession(p);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
await p.screenshot({ path: `screenshots-out/05-preview-app${lang === "ar" ? "-ar" : ""}.png` });
await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });

await p.getByRole("button", { name: T.email }).click();
console.log("after email:", (await p.locator("body").innerText()).split("\n").slice(-1)[0]);
await p.getByRole("button", { name: lang === "ar" ? "من جديد" : "Start over" }).click();
await toPreview();
await p.getByRole("button", { name: T.notNow }).click();
console.log("after not now, on welcome:", await p.getByRole("button", { name: "Hold to talk" }).count() === 1);
console.log("errors:", errs);
await b.close();
