// Visual diff of an app capture against the design render (same size), in headless Chromium.
// Usage: node scripts/compare.mjs <design.png> <app.png> <side-by-side-out.png>
// Prints the share of pixels that differ noticeably (per-channel delta > 40) and writes
// design | app | diff (red = different) next to each other.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [a, b, out] = process.argv.slice(2);
if (!a || !b || !out) {
  console.error("usage: node scripts/compare.mjs <design.png> <app.png> <out.png>");
  process.exit(1);
}
const url = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const result = await page.evaluate(async ([ua, ub]) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib] = await Promise.all([load(ua), load(ub)]);
  const w = Math.min(ia.width, ib.width);
  const h = Math.min(ia.height, ib.height);
  const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h); };
  const da = px(ia), db = px(ib);
  const diff = new ImageData(w, h);
  let bad = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    const off = d > 40;
    if (off) bad++;
    const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3;
    diff.data.set(off ? [230, 30, 60, 255] : [g, g, g, 90], i);
  }
  const c = new OffscreenCanvas(w * 3, h);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, w * 3, h);
  x.drawImage(ia, 0, 0);
  x.drawImage(ib, w, 0);
  x.putImageData(diff, w * 2, 0);
  const blob = await c.convertToBlob({ type: "image/png" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { pct: (bad / (w * h)) * 100, png: btoa(s) };
}, [url(a), url(b)]);
const { writeFileSync } = await import("node:fs");
writeFileSync(out, Buffer.from(result.png, "base64"));
await browser.close();
console.log(`${out}: ${result.pct.toFixed(2)}% of pixels differ`);
