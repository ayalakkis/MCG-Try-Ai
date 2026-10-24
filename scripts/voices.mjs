// Lists Gemini TTS voices for Gulf/Kuwaiti Arabic from the Extended Voice Library, so you can
// pick one for GEMINI_TTS_VOICE (the accent comes from the voice, not from the style prompt).
// Usage: npm run voices [-- --all]   (needs GEMINI_API_KEY in .env.local)
import { GoogleGenAI } from "@google/genai";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.GEMINI_API_KEY) {
  console.error("✗ GEMINI_API_KEY is not set in .env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const all = process.argv.includes("--all");
const filters = all
  ? { language_code: ["ar-KW", "ar-SA", "ar-AE", "ar-BH", "ar-QA", "ar-OM", "ar-XA", "ar"] }
  : { region_code: ["KW", "SA", "AE", "BH", "QA", "OM"] };

let page;
let count = 0;
do {
  const res = await ai.voices.list({ ...filters, page_size: 100, page_token: page });
  for (const v of res.voices ?? []) {
    count++;
    console.log(`${v.id ?? v.name}\t${v.display_name ?? ""}\t${v.language_code ?? ""}\t${v.accent ?? ""}\t${v.gender ?? ""}\t${v.description ?? ""}`);
  }
  page = res.next_page_token;
} while (page);
console.log(`\n${count} voices. Set GEMINI_TTS_VOICE=<id> in .env.local and try it in /voice-lab.`);
if (!count && !all) console.log("Nothing for Gulf regions: try `npm run voices -- --all`.");
