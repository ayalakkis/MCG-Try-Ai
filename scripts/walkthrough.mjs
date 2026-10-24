// Playwright walkthrough of every screen and system sheet in EN and AR at 1366×1024, mocks on,
// with a fake clock. Screenshots → screenshots-out/walkthrough/<lang>-NN-<name>.png
// Usage (dev server running with mocks: no keys, or USE_MOCKS=true): npm run walkthrough [-- en|ar]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const only = process.argv[2];
const langs = only === "en" || only === "ar" ? [only] : ["en", "ar"];
const T = {
  en: { hold: "Hold to talk", example: "Café happy hour", email: "Email me the full strategy", send: "Send", startOver: "Start over", answer: "Hold to answer", imHere: "I'm here", privacy: "Privacy", close: "Close" },
  ar: { hold: "اضغط مطوّل وتكلّم", example: "عرض قهوة العصر", email: "أرسلوا لي الاستراتيجية كاملة", send: "أرسل", startOver: "من جديد", answer: "اضغط مطوّل وجاوب", imHere: "موجود", privacy: "الخصوصية", close: "سكّر" },
};
const OUT = "screenshots-out/walkthrough";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const lang of langs) {
  const t = T[lang];
  const page = await browser.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.clock.install();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.evaluate(() => "__mcg" in window))) throw new Error("dev hook missing: run against `npm run dev`");

  let n = 0;
  const shot = async (name) => {
    const file = `${OUT}/${lang}-${String(++n).padStart(2, "0")}-${name}.png`;
    await page.waitForTimeout(350); // CSS fades run on real time, not the fake clock
    await page.screenshot({ path: file });
    results.push(file);
  };
  const tick = (ms) => page.clock.runFor(ms);
  const dispatch = (action) => page.evaluate((a) => window.__mcg.dispatch(a), action);
  const button = (name) => page.getByRole("button", { name, exact: true });

  if (lang === "ar") await button("عربي").click();
  console.log(`dir=${await page.evaluate(() => document.documentElement.dir)} (${lang})`);

  // 01 Welcome
  await tick(500);
  await shot("welcome");

  // 02 Listening: hold the button down (mock speech streams the sample caption)
  const hold = await button(t.hold).boundingBox();
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await tick(3_200);
  await shot("listening");
  await page.mouse.up();

  // 03 Conversation: first AI turn spoken, then a quick answer
  await tick(5_000);
  await shot("conversation");
  const quick = page.locator('[class*="quick"] button, [class*="answers"] button');
  if (await quick.count()) {
    await quick.first().click();
    await tick(5_000);
    await shot("conversation-next");
  }

  // Sheets over Conversation
  await dispatch({ type: "ERROR", state: "missed" });
  await tick(300);
  await shot("sheet-missed");
  await dispatch({ type: "ERROR", state: "mic" });
  await tick(300);
  await shot("sheet-mic");
  await dispatch({ type: "ERROR", state: "reconnecting" });
  await tick(300);
  await shot("sheet-reconnecting");
  await dispatch({ type: "DISMISS_ERROR" });
  await tick(5_000);

  // Inactivity: 60 s → "Still there?" with a live 10 s countdown, then "I'm here"
  await tick(55_000);
  await page.locator('[role="alertdialog"]').waitFor({ timeout: 5_000 }).catch(() => {});
  if (!(await page.locator('[role="alertdialog"]').count())) await tick(3_000);
  await shot("sheet-still-there");
  await button(t.imHere).click();
  await tick(500);
  console.log(`still-there dismissed: ${!(await page.locator('[role="alertdialog"]').count())}`);

  // Start over → Welcome, then the example path to CREATE → PREVIEW
  await button(t.startOver).first().click();
  await tick(500);
  if (lang === "ar") await button("عربي").click();
  await dispatch({ type: "PICK_EXAMPLE", id: "walkthrough", brief: { brandName: "Bloom Coffee", business: { en: "Specialty café", ar: "مقهى مختص" }, goal: { en: "Evening visits", ar: "زوار بالمسا" }, audience: { en: "Young pros", ar: "موظفين شباب" }, location: { en: "Salmiya", ar: "السالمية" }, keywords: [{ en: "Salmiya", ar: "السالمية" }, { en: "After work", ar: "بعد الدوام" }, { en: "5–8 PM", ar: "5–8 المسا" }, { en: "Reels", ar: "ريلز" }] } }); // Examples were removed from Welcome
  await tick(12_000);
  await shot("create");
  await tick(26_000);
  await tick(5_000);
  await shot("preview");

  // 06 Email: invalid, privacy sheet, valid
  await button(t.email).click();
  await tick(4_000);
  await page.locator("#i-email").fill("sara.alenezi@gmail");
  await tick(1_500);
  await shot("email-invalid");
  await page.locator("form button").first().click(); // "gmail.com?" suggestion
  await page.locator("#i-name").fill(lang === "ar" ? "سارة" : "Sara");
  await page.locator("#i-email").focus();
  await shot("email");
  await page.getByRole("button", { name: t.privacy }).click();
  await tick(300);
  await shot("sheet-privacy");
  await button(t.close).click();

  // 07 Thank you (after the mock send), then the 15 s reset
  await button(t.send).click();
  await tick(300);
  await shot("email-sending");
  await tick(4_000);
  await shot("thanks");
  await tick(12_000);
  const backHome = (await button(t.hold).count()) + (await button(T.en.hold).count()) > 0;
  console.log(`thank-you auto reset → welcome: ${backHome}`);
  await shot("welcome-after-reset");

  console.log(`${lang}: ${n} screenshots, console errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
