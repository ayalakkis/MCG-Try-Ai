// Renders the WhatsApp/Instagram line icons (components/icons.tsx paths) to PNG for the email CTA,
// since mail clients don't render SVG. Output: public/email/*.png at 3× (60×60 shown at 20×20).
// Usage: node scripts/make-email-icons.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ICONS = {
  whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".6"/>',
};
const OUT = [
  ["whatsapp", "#144074", "whatsapp-ink.png"],
  ["instagram", "#ffffff", "instagram-white.png"],
  ["whatsapp", "#ffffff", "whatsapp-white.png"],
  ["instagram", "#144074", "instagram-ink.png"],
];

mkdirSync("public/email", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 20, height: 20 }, deviceScaleFactor: 3 });
for (const [name, color, file] of OUT) {
  await p.setContent(`<html><body style="margin:0;background:transparent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg></body></html>`);
  await p.screenshot({ path: `public/email/${file}`, omitBackground: true });
  console.log("saved public/email/" + file);
}
await b.close();
