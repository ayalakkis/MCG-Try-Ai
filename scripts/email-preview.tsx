// Renders both strategy emails with the Bloom Coffee sample to email-preview/{en,ar}.html
// and screenshots them next to design/reference/email-*.html for comparison.
// Usage: npm run email:preview   (images load from APP_URL, default http://localhost:3000 = npm run dev)
import { render } from "@react-email/components";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import StrategyEmail from "../emails/StrategyEmail";
import StrategyEmailAr from "../emails/StrategyEmailAr";

async function main() {
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
mkdirSync("email-preview", { recursive: true });

const files: { lang: string; html: string; text: string }[] = [];
for (const [lang, Template] of [["en", StrategyEmail], ["ar", StrategyEmailAr]] as const) {
  const el = <Template {...Template.PreviewProps} appUrl={appUrl} />;
  const html = await render(el, { pretty: true });
  const text = await render(el, { plainText: true });
  writeFileSync(`email-preview/${lang}.html`, html);
  writeFileSync(`email-preview/${lang}.txt`, text);
  files.push({ lang, html, text });
  console.log(`email-preview/${lang}.html  (${(html.length / 1024).toFixed(1)} KB, Gmail clips at 102 KB)`);
}

if (!process.argv.includes("--no-shots")) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1 });
  for (const { lang } of files) {
    await p.goto(pathToFileURL(resolve(`email-preview/${lang}.html`)).href, { waitUntil: "networkidle" });
    await p.screenshot({ path: `email-preview/${lang}.png`, fullPage: true });
    await p.goto(pathToFileURL(resolve(`design/reference/email-${lang}.html`)).href, { waitUntil: "networkidle" });
    await p.screenshot({ path: `email-preview/${lang}-reference.png`, fullPage: true });
    console.log(`email-preview/${lang}.png  vs  email-preview/${lang}-reference.png`);
  }
  await b.close();
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
