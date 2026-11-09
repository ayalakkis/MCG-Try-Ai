// Builds the Arabic and English strategy emails exactly as the Gmail path would (inline images included)
// with nodemailer's stream transport: nothing connects to Gmail and nothing is sent.
// Usage: npx tsx scripts/gmail-dry-run.tsx
import { render } from "@react-email/components";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import StrategyEmail from "../emails/StrategyEmail";
import StrategyEmailAr from "../emails/StrategyEmailAr";
import { EMAIL_IMAGES } from "../emails/StrategyEmailBase";

async function main() {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const attachments = Object.entries(EMAIL_IMAGES).map(([path, cid]) => ({
    filename: path.split("/").pop(),
    content: readFileSync(join(process.cwd(), "public", path)),
    cid,
  }));
  for (const [lang, Template] of [["en", StrategyEmail], ["ar", StrategyEmailAr]] as const) {
    const el = <Template {...Template.PreviewProps} appUrl="cid:" />;
    const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
    const info = await transport.sendMail({
      from: { name: "MCG", address: "booth@example.com" },
      to: "visitor@example.com",
      subject: lang === "ar" ? "استراتيجيتك التسويقية من MCG" : "Your marketing strategy from MCG",
      html,
      text,
      attachments,
    });
    const raw = (info.message as Buffer).toString();
    const cids = [...html.matchAll(/src="cid:([^"]+)"/g)].map((m) => m[1]);
    const missing = cids.filter((c) => !raw.includes(`Content-ID: <${c}>`));
    console.log(`${lang}: ${(raw.length / 1024).toFixed(0)} KB message, ${attachments.length} inline images, ${cids.length} image refs, missing: ${missing.length ? missing.join(", ") : "none"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
