// Example → CREATE → PREVIEW → EMAIL (06) → THANK YOU (07) with mocks and a fake clock.
// Captures both design states, then checks the inline invalid state and the 15 s reset.
// Usage (dev server running, mocks on): node scripts/e2e-email.mjs [en|ar]
import { chromium } from "@playwright/test";

const lang = process.argv[2] === "ar" ? "ar" : "en";
const sfx = lang === "ar" ? "-ar" : "";
const T = {
  en: { example: "Café happy hour", email: "Email me the full strategy", send: "Send", hello: "Hello" },
  ar: { example: "عرض قهوة العصر", email: "أرسلوا لي الاستراتيجية كاملة", send: "أرسل", hello: "هلا" },
}[lang];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", (e) => errs.push(String(e)));

const freeze = async () => {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
  await p.evaluate(() => {
    document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(0); });
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; });
  });
  return async () => cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
};

await p.clock.install();
await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
if (lang === "ar") await p.getByRole("button", { name: "عربي" }).click();
await p.evaluate((a) => window.__mcg.dispatch(a), ({ type: "PICK_EXAMPLE", id: "walkthrough", brief: { brandName: "Bloom Coffee", business: { en: "Specialty café", ar: "مقهى مختص" }, goal: { en: "Evening visits", ar: "زوار بالمسا" }, audience: { en: "Young pros", ar: "موظفين شباب" }, location: { en: "Salmiya", ar: "السالمية" }, keywords: [{ en: "Salmiya", ar: "السالمية" }, { en: "After work", ar: "بعد الدوام" }, { en: "5–8 PM", ar: "5–8 المسا" }, { en: "Reels", ar: "ريلز" }] } })); // Examples were removed from Welcome
await p.clock.runFor(37_000);
await p.clock.runFor(5_000);
await p.getByRole("button", { name: T.email }).click();
await p.clock.runFor(4_000); // spoken line done

const input = p.locator("#i-email");
console.log("email focused:", await input.evaluate((el) => el === document.activeElement));
console.log("send disabled when empty:", await p.getByRole("button", { name: T.send }).isDisabled());

// Invalid: missing TLD → inline hint + suggestion chip, Send disabled.
await input.fill("sara.alenezi@gmail");
await p.clock.runFor(1_500);
console.log("invalid message:", await p.locator("#i-email-msg").textContent());
console.log("suggestion chip:", await p.locator("form button").first().textContent());
console.log("send disabled when invalid:", await p.getByRole("button", { name: T.send }).isDisabled());
await p.screenshot({ path: `screenshots-out/06-email-invalid${sfx}.png` });

// Tap the suggestion → valid. Then the design state (focused field, name Sara).
await p.locator("form button").first().click();
console.log("after suggestion:", await input.inputValue());
await p.locator("#i-name").fill(lang === "ar" ? "سارة" : "Sara");
await input.focus();
const resume = await freeze();
await p.screenshot({ path: `screenshots-out/06-email-app${sfx}.png` });
await resume();

await p.getByRole("button", { name: T.send }).click();
console.log("sending state:", await p.locator("button[aria-busy=true]").count() === 1);
await p.clock.runFor(1_000);
await p.clock.runFor(3_000); // design shows 12 s left
console.log("thanks h1:", await p.locator("h1").textContent());
console.log("QR codes:", await p.locator('[role="img"] svg path').count());
const resume2 = await freeze();
await p.screenshot({ path: `screenshots-out/07-thanks-app${sfx}.png` });
await resume2();

await p.clock.runFor(13_000);
console.log("auto reset to welcome:", await p.getByRole("button", { name: "EN" }).count() === 1 && (await p.locator("body").innerText()).includes("Hello"));
console.log("errors:", errs);
await b.close();
