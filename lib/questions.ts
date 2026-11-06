/**
 * The five questions (design/screens/02-questions.html), in BRIEF_FIELDS order. The visitor taps
 * one or more options and can type something else; the labels are written to the brief as-is.
 * Arabic is Modern Standard Arabic, like the rest of the copy.
 */
import type { BriefField, Localized } from "./services/types";

const L = (en: string, ar: string): Localized => ({ en, ar });

export type OptionIcon =
  | "cup" | "fork" | "bag" | "sparkle" | "dumbbell" | "home" | "heart" | "dots"
  | "star" | "briefcase" | "family" | "user" | "building" | "globe"
  | "cart" | "pin" | "megaphone" | "rocket" | "users" | "refresh"
  | "eye" | "door" | "flag" | "calendar" | "phone" | "compass" | "map";

export interface QuestionOption {
  id: string;
  icon: OptionIcon;
  label: Localized;
}

export interface Question {
  field: BriefField;
  title: Localized;
  /** Short name in the "Your brief" checklist. */
  short: Localized;
  options: QuestionOption[];
}

const o = (id: string, icon: OptionIcon, en: string, ar: string): QuestionOption => ({ id, icon, label: L(en, ar) });

export const QUESTIONS: Question[] = [
  {
    field: "business",
    title: L("What's your business?", "ما نوع مشروعك؟"),
    short: L("Business", "النشاط"),
    options: [
      o("cafe", "cup", "Café & coffee", "مقهى وقهوة"),
      o("restaurant", "fork", "Restaurant", "مطعم"),
      o("retail", "bag", "Fashion & retail", "أزياء وتجزئة"),
      o("beauty", "sparkle", "Beauty & salon", "تجميل وصالون"),
      o("fitness", "dumbbell", "Fitness", "لياقة بدنية"),
      o("realestate", "home", "Real estate", "عقارات"),
      o("health", "heart", "Clinic & health", "عيادة وصحة"),
    ],
  },
  {
    field: "audience",
    title: L("Who do you want to reach?", "من تريد أن تصل إليه؟"),
    short: L("Audience", "الجمهور"),
    options: [
      o("genz", "star", "Gen Z", "الجيل زد"),
      o("professionals", "briefcase", "Young professionals", "موظفون شباب"),
      o("families", "family", "Families", "العائلات"),
      o("women", "user", "Women 25–45", "نساء 25–45"),
      o("b2b", "building", "Business owners", "أصحاب الأعمال"),
      o("everyone", "globe", "Everyone", "الجميع"),
    ],
  },
  {
    field: "goal",
    title: L("What's your main goal?", "ما هدفك الرئيسي؟"),
    short: L("Goal", "الهدف"),
    options: [
      o("sales", "cart", "More sales", "مبيعات أكثر"),
      o("visits", "pin", "More visits", "زيارات أكثر"),
      o("awareness", "megaphone", "Brand awareness", "شهرة العلامة"),
      o("launch", "rocket", "Launch something new", "إطلاق منتج جديد"),
      o("followers", "users", "Grow followers", "متابعون أكثر"),
      o("winback", "refresh", "Win back customers", "استعادة العملاء"),
    ],
  },
  {
    field: "challenge",
    title: L("What's holding you back?", "ما الذي يعيقك؟"),
    short: L("Challenge", "التحدي"),
    options: [
      o("unknown", "eye", "Not enough people know us", "قلة من يعرفنا"),
      o("nobuy", "door", "People know us but don't buy", "يعرفوننا لكن لا يشترون"),
      o("competition", "flag", "Strong competition", "منافسة قوية"),
      o("slow", "calendar", "Slow days", "أيام بطيئة"),
      o("social", "phone", "Social media isn't working", "وسائل التواصل لا تنجح"),
      o("start", "compass", "Don't know where to start", "لا أعرف من أين أبدأ"),
    ],
  },
  {
    field: "location",
    title: L("Where are you?", "أين يقع مشروعك؟"),
    short: L("Area", "المنطقة"),
    options: [
      // Kuwait's six governorates; a specific area (Salmiya, Fintas…) goes in the text box.
      o("capital", "pin", "Capital (Kuwait City)", "العاصمة"),
      o("hawalli", "pin", "Hawalli", "حولي"),
      o("farwaniya", "pin", "Farwaniya", "الفروانية"),
      o("mubarak", "pin", "Mubarak Al-Kabeer", "مبارك الكبير"),
      o("ahmadi", "pin", "Ahmadi", "الأحمدي"),
      o("jahra", "pin", "Jahra", "الجهراء"),
      o("online", "globe", "Online only", "أونلاين فقط"),
      o("all", "map", "All of Kuwait", "الكويت كلها"),
    ],
  },
];
