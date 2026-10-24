// Walks Welcome → Listening → Conversation with the mocks and captures the 03 design state.
// Usage (dev server running): node scripts/e2e-conversation.mjs [en|ar]
import { chromium } from "@playwright/test";

const lang = process.argv[2] === "ar" ? "ar" : "en";
const L = {
  en: { hold: "Hold to talk", answer: "Hold to answer", budget: "KWD 500–1,500", timing: "Next month" },
  ar: { hold: "اضغط مطوّل وتكلّم", answer: "اضغط مطوّل وجاوب", budget: "500 – 1,500 د.ك", timing: "الشهر الجاي" },
}[lang];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(String(e)));

const holdOn = async (name, ms) => {
  const bb = await p.getByRole("button", { name }).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(ms);
  await p.mouse.up();
};
const snapshot = async (label) => {
  const h1 = await p.locator("h1").first().textContent().catch(() => null);
  const quote = await p.locator("p").first().textContent().catch(() => null);
  const count = await p.getByText(/\d \/ 6/).textContent().catch(() => null);
  console.log(`${label}: count=${count} | quote=${quote} | h1=${h1}`);
};

await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
if (lang === "ar") await p.getByRole("button", { name: "عربي" }).click();
await holdOn(L.hold, 5000);
await p.waitForTimeout(200);
await snapshot("after first utterance (thinking)");
await p.waitForTimeout(5500);
await snapshot("after AI turn 1");

await holdOn(L.answer, 2500);
await p.waitForTimeout(6000); // think + speak
await snapshot("after voice answer (design state)");

const cdp = await p.context().newCDPSession(p);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
await p.screenshot({ path: `screenshots-out/03-conversation-app${lang === "ar" ? "-ar" : ""}.png` });
await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });

await p.getByRole("button", { name: L.budget }).click();
await p.waitForTimeout(5500);
await snapshot("after quick answer budget");
await p.getByRole("button", { name: L.timing }).click();
await p.waitForTimeout(800);
await snapshot("after quick answer timing (closing line)");
await p.waitForTimeout(4500);
console.log("final screen text:", (await p.locator("body").innerText()).split("\n").slice(-1)[0]);
console.log("errors:", errs);
await b.close();
