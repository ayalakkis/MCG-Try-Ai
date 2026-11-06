// Renders the result-screen illustrations (public/illustrations/*.svg) to PNG for the strategy
// email, since mail clients don't render SVG. Output: public/email/art/*.png at 3×.
// Usage: npm run email:art   (re-run after changing an illustration)
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

/** [svg name, png name, width, height, background]: icons at 88×73, the skyline on navy. */
const OUT = [
  ["marketing", "marketing", 88, 73],
  ["social", "social", 88, 73],
  ["influencers", "influencers", 88, 73],
  ["event", "event", 88, 73],
  ["activation", "activation", 88, 73],
  ["hero", "skyline", 180, 174, "#144074"],
];

mkdirSync("public/email/art", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 200, height: 200 }, deviceScaleFactor: 3 });
for (const [svg, png, w, h, bg] of OUT) {
  let src = readFileSync(`public/illustrations/${svg}.svg`, "utf8");
  // The skyline sits in the right half of the banner art; crop to it.
  if (svg === "hero") src = src.replace('viewBox="0 0 520 270"', 'viewBox="240 0 280 270"');
  await p.setContent(`<html><body style="margin:0;background:${bg ?? "transparent"}"><div style="width:${w}px;height:${h}px">${src.replace("<svg ", `<svg width="${w}" height="${h}" `)}</div></body></html>`);
  await p.locator("div").screenshot({ path: `public/email/art/${png}.png`, omitBackground: !bg });
  console.log(`saved public/email/art/${png}.png`);
}
await b.close();
