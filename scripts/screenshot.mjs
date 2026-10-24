// Usage: node scripts/screenshot.mjs <url> <out.png> [--scale 1.5]
// Renders at 1366×1024 with animations frozen at t=0 so captures are comparable with design/screenshots.
import { chromium } from "@playwright/test";

const [url, out] = process.argv.slice(2);
const scale = Number(process.argv[process.argv.indexOf("--scale") + 1]) || 1.5;
if (!url || !out) {
  console.error("usage: node scripts/screenshot.mjs <url> <out.png> [--scale 1.5]");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: scale });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(0); });
  document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; });
});
await page.waitForTimeout(300);
await page.screenshot({ path: out });
await browser.close();
if (errors.length) console.log("console errors:\n" + errors.join("\n"));
console.log("saved", out);
