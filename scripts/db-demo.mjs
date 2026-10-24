// Fills the admin dashboard with realistic demo data (last 7 days of booth traffic), flagged demo=true.
// Real visitors are never touched.
// Usage: npm run db:demo            → replace demo data
//        npm run db:demo -- --clear → remove all demo data (do this before the event)
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL is not set (.env.local)");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

await sql.query("DELETE FROM leads WHERE demo");
await sql.query("DELETE FROM sessions WHERE demo");
await sql.query("DELETE FROM events WHERE demo");
if (process.argv.includes("--clear")) {
  console.log("✓ demo data removed (real visitors kept)");
  process.exit(0);
}

// Deterministic randomness, so the demo looks the same every time it is loaded.
let seed = 20261019;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const L = (en, ar) => ({ en, ar });

/** Businesses that visit an MCG booth in Kuwait, with the campaign the AI would name for them. */
const PROFILES = [
  { brand: "Bloom Coffee", business: L("Specialty café", "مقهى مختص"), location: L("Salmiya", "السالمية"), goal: L("Evening visits", "زوار بالمسا"), audience: L("Young pros", "موظفين شباب"), name: L("After Hours Brew", "قهوة بعد الدوام") },
  { brand: "Dar Al Sadu", business: L("Abaya boutique", "بوتيك عبايات"), location: L("The Avenues", "الأفنيوز"), goal: L("More online sales", "مبيعات أونلاين"), audience: L("Women 20–35", "بنات 20–35"), name: L("Eid in Every Thread", "العيد بكل خيط") },
  { brand: "Nasij", business: L("Handmade rugs", "سجاد يدوي"), location: L("All Kuwait", "كل الكويت"), goal: L("More online sales", "مبيعات أونلاين"), audience: L("Young families", "عوايل شباب"), name: L("Warm Your Home", "دفا بيتك") },
  { brand: "Mashawi Al Fareej", business: L("Grill restaurant", "مطعم مشاوي"), location: L("Hawalli", "حولي"), goal: L("More deliveries", "طلبات توصيل أكثر"), audience: L("Families", "العوايل"), name: L("Fareej Nights", "ليالي الفريج") },
  { brand: "", business: L("Beauty clinic", "عيادة تجميل"), location: L("Jabriya", "الجابرية"), goal: L("More bookings", "حجوزات أكثر"), audience: L("Women 25–45", "نساء 25–45"), name: L("Glow Week", "أسبوع النضارة") },
  { brand: "FitLab", business: L("Gym", "نادي رياضي"), location: L("Shuwaikh", "الشويخ"), goal: L("New members", "مشتركين جدد"), audience: L("Young pros", "موظفين شباب"), name: L("5 AM Club", "نادي الفجر") },
  { brand: "", business: L("Flower shop", "محل ورد"), location: L("Jabriya", "الجابرية"), goal: L("Brand awareness", "يعرفونا أكثر"), audience: L("Couples", "المتزوجين"), name: L("Say It In Petals", "قولها بالورد") },
  { brand: "Qahwat Yuma", business: L("Arabic coffee", "قهوة عربية"), location: L("Kuwait City", "العاصمة"), goal: L("Office orders", "طلبات مكاتب"), audience: L("Companies", "الشركات"), name: L("Diwaniya at Work", "ديوانية الدوام") },
  { brand: "", business: L("Real estate agency", "مكتب عقار"), location: L("All Kuwait", "كل الكويت"), goal: L("More leads", "عملاء أكثر"), audience: L("New families", "عوايل جديدة"), name: L("First Keys", "أول مفتاح") },
  { brand: "Sweet Spoon", business: L("Dessert shop", "محل حلويات"), location: L("Salmiya", "السالمية"), goal: L("Weekend visits", "زوار الويكند"), audience: L("Students", "طلاب"), name: L("Spoon Saturday", "سبت الملعقة") },
  { brand: "", business: L("Car detailing", "تلميع سيارات"), location: L("Ardiya", "العارضية"), goal: L("More bookings", "حجوزات أكثر"), audience: L("Car lovers", "محبي السيارات"), name: L("Showroom Shine", "لمعة الوكالة") },
  { brand: "Little Steps", business: L("Kids nursery", "حضانة أطفال"), location: L("Mishref", "مشرف"), goal: L("New registrations", "تسجيل جديد"), audience: L("Working mums", "الأمهات الموظفات"), name: L("Safe Hands", "بأيدي أمينة") },
  { brand: "", business: L("Perfume brand", "براند عطور"), location: L("Online", "أونلاين"), goal: L("More online sales", "مبيعات أونلاين"), audience: L("Gift buyers", "اللي يدورون هدايا"), name: L("Oud Moments", "لحظات العود") },
  { brand: "Bait Al Matbakh", business: L("Cooking academy", "أكاديمية طبخ"), location: L("Kuwait City", "العاصمة"), goal: L("Course sign-ups", "تسجيل بالكورسات"), audience: L("Women 20–40", "نساء 20–40"), name: L("Ramadan Kitchen", "مطبخ رمضان") },
  { brand: "", business: L("Dental clinic", "عيادة أسنان"), location: L("Hawalli", "حولي"), goal: L("More bookings", "حجوزات أكثر"), audience: L("Families", "العوايل"), name: L("Smile Check", "فحص الابتسامة") },
  { brand: "Saj & Co", business: L("Food truck", "فود ترك"), location: L("Al Shaheed Park", "حديقة الشهيد"), goal: L("Brand awareness", "يعرفونا أكثر"), audience: L("Students", "طلاب"), name: L("Find the Truck", "دور الترك") },
  { brand: "", business: L("Tailoring shop", "محل خياطة"), location: L("Fahaheel", "الفحيحيل"), goal: L("Eid orders", "طلبات العيد"), audience: L("Men 25–50", "رجال 25–50"), name: L("Perfect Dishdasha", "دشداشة مضبوطة") },
  { brand: "GreenCart", business: L("Grocery delivery", "توصيل خضار"), location: L("All Kuwait", "كل الكويت"), goal: L("App downloads", "تحميل التطبيق"), audience: L("Busy families", "العوايل المشغولة"), name: L("Fresh by Six", "طازج قبل الست") },
];

const PEOPLE = [
  ["Fatma Al-Sabah", "fatma.alsabah"], ["Abdullah Al-Mutairi", "a.almutairi"], ["Noura Al-Kandari", "noura.k"], ["Yousef Al-Ajmi", "yousef.ajmi"],
  ["Sara Al-Enezi", "sara.alenezi"], ["Hamad Al-Rashidi", "hamad.r"], ["Dana Al-Shammari", "dana.shammari"], ["Khaled Al-Otaibi", "khaled.otaibi"],
  ["Mariam Al-Hajri", "mariam.hajri"], ["Ali Behbehani", "ali.behbehani"], ["Reem Al-Fadhli", "reem.fadhli"], ["Bader Al-Saleh", "bader.saleh"],
  ["Hessa Al-Ghanim", "hessa.ghanim"], ["Mohammed Hayat", "m.hayat"], ["Lulwa Al-Bader", "lulwa.bader"], ["Talal Al-Azmi", "talal.azmi"],
  ["", "info.shop"], ["Ahmad Dashti", "ahmad.dashti"], ["Shahad Al-Mansour", "shahad.m"], ["", "hello.store"],
];

// Kuwait is UTC+3; booth hours 10:00–22:00.
const kuwaitMidnight = (daysAgo) => {
  const k = new Date(Date.now() + 3 * 3_600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - daysAgo) - 3 * 3_600_000;
};
const VISITORS_PER_DAY = [24, 31, 18, 38, 42, 27, 14]; // 6 days ago → today (today so far)

const ev = { type: [], lang: [], at: [] };
const sessions = { id: [], lang: [], brief: [], name: [], emailed: [], at: [] };
const leads = { session: [], email: [], name: [], lang: [], brief: [], strategy: [], at: [] };
let person = 0;

for (let d = 6; d >= 0; d--) {
  const visitors = VISITORS_PER_DAY[6 - d];
  const dayStart = kuwaitMidnight(d);
  const latest = d === 0 ? Math.min(Date.now() - 5 * 60_000, dayStart + 22 * 3_600_000) : dayStart + 22 * 3_600_000;
  for (let v = 0; v < visitors; v++) {
    const start = dayStart + 10 * 3_600_000 + rand() * (latest - dayStart - 10 * 3_600_000);
    if (start > latest) continue;
    const lang = rand() < 0.45 ? "ar" : "en";
    const at = (offsetMin) => new Date(start + offsetMin * 60_000).toISOString();
    ev.type.push("session_started"); ev.lang.push(lang); ev.at.push(at(0));
    if (rand() > 0.74) continue; // left before the end
    ev.type.push("brief_completed"); ev.lang.push(lang); ev.at.push(at(2));
    ev.type.push("strategy_generated"); ev.lang.push(lang); ev.at.push(at(3));
    const p = pick(PROFILES);
    const brief = { business: p.business, goal: p.goal, audience: p.audience, location: p.location, ...(p.brand ? { brandName: p.brand } : {}) };
    const sessionId = `demo-${randomUUID()}`;
    const emailed = rand() < 0.58;
    sessions.id.push(sessionId); sessions.lang.push(lang); sessions.brief.push(JSON.stringify(brief)); sessions.name.push(JSON.stringify(p.name));
    sessions.emailed.push(emailed); sessions.at.push(at(3));
    if (!emailed) continue;
    ev.type.push("email_sent"); ev.lang.push(lang); ev.at.push(at(5));
    if (rand() > 0.72) continue; // emailed, but didn't tick "MCG can contact me"
    const [full, handle] = PEOPLE[person++ % PEOPLE.length];
    leads.session.push(sessionId); leads.email.push(`${handle}${person > PEOPLE.length ? person : ""}@example.com`);
    leads.name.push(full || null); leads.lang.push(lang); leads.brief.push(JSON.stringify(brief)); leads.strategy.push(JSON.stringify(p.name)); leads.at.push(at(5));
  }
}

await sql.query(
  `INSERT INTO events (type, lang, created_at, demo) SELECT t, l, a, true FROM unnest($1::text[], $2::text[], $3::timestamptz[]) AS x(t, l, a)`,
  [ev.type, ev.lang, ev.at],
);
await sql.query(
  `INSERT INTO sessions (session_id, lang, brief, strategy_name, emailed, created_at, demo)
   SELECT i, l, b::jsonb, n::jsonb, e, a, true FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::bool[], $6::timestamptz[]) AS x(i, l, b, n, e, a)`,
  [sessions.id, sessions.lang, sessions.brief, sessions.name, sessions.emailed, sessions.at],
);
await sql.query(
  `INSERT INTO leads (session_id, email, name, consent, lang, brief, strategy_name, created_at, demo)
   SELECT s, e, n, true, l, b::jsonb, st::jsonb, a, true FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::timestamptz[]) AS x(s, e, n, l, b, st, a)`,
  [leads.session, leads.email, leads.name, leads.lang, leads.brief, leads.strategy, leads.at],
);

const count = (t) => ev.type.filter((x) => x === t).length;
console.log(`✓ demo data loaded (flagged demo, last 7 days):`);
console.log(`  ${count("session_started")} visitors · ${count("brief_completed")} completed · ${count("email_sent")} emailed · ${leads.email.length} leads`);
console.log(`  Remove before the event: npm run db:demo -- --clear`);
