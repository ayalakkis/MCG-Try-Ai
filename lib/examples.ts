/**
 * Complete, realistic Kuwait briefs for the offline mock, scripts and email tests.
 */
import type { Brief, Localized } from "./services/types";

const L = (en: string, ar: string): Localized => ({ en, ar });

export type ExampleId = "cafe" | "ramadan" | "online";

/** Every field filled; brandName only where the example has a named business. */
export type ExampleBrief = Required<Omit<Brief, "brandName">> & Pick<Brief, "brandName">;

export const EXAMPLES: Record<ExampleId, ExampleBrief> = {
  /** Café happy hour: the Bloom Coffee sample used across the design. */
  cafe: {
    brandName: "Bloom Coffee",
    business: L("Specialty café", "مقهى مختص"),
    industry: "cafe",
    challenge: L("Slow days", "أيام بطيئة"),
    goal: L("Evening visits", "زيارات مسائية"),
    audience: L("Young pros", "موظفون شباب"),
    location: L("Salmiya", "السالمية"),
    keywords: [L("Salmiya", "السالمية"), L("After work", "بعد العمل"), L("5–8 PM", "5–8 مساءً"), L("Reels", "ريلز")],
  },
  /** Ramadan campaign: a family restaurant filling iftar and ghabga tables. */
  ramadan: {
    business: L("Family restaurant", "مطعم عائلي"),
    industry: "restaurant",
    challenge: L("Strong competition", "منافسة قوية"),
    goal: L("Iftar bookings", "حجوزات الإفطار"),
    audience: L("Families", "العائلات"),
    location: L("Kuwait City", "العاصمة"),
    keywords: [L("Iftar", "الإفطار"), L("Ghabga", "الغبقة"), L("Families", "العائلات"), L("Stories", "القصص")],
  },
  /** Online sales: an Instagram abaya brand selling with delivery across Kuwait. */
  online: {
    business: L("Abaya online store", "متجر عبايات إلكتروني"),
    industry: "retail",
    challenge: L("Social media isn't working", "وسائل التواصل لا تنجح"),
    goal: L("More online sales", "مبيعات إلكترونية أكثر"),
    audience: L("Women 20–35", "نساء 20–35"),
    location: L("All Kuwait", "الكويت كلها"),
    keywords: [L("Eid looks", "إطلالات العيد"), L("Free delivery", "توصيل مجاني"), L("Payday", "يوم الرواتب"), L("TikTok", "تيك توك")],
  },
};
