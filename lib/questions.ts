/**
 * The five tap-to-choose questions (design/screens/02-questions.html), in BRIEF_FIELDS order.
 * Each option's label is written to the brief as-is; "other" opens a short text field.
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

/** Every question ends with "Other", which lets the visitor type a short answer. */
const other = o("other", "dots", "Other", "أخرى");

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
      other,
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
      other,
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
      other,
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
      other,
    ],
  },
  {
    field: "location",
    title: L("Where are you?", "أين يقع مشروعك؟"),
    short: L("Area", "المنطقة"),
    options: [
      o("capital", "pin", "Kuwait City", "مدينة الكويت"),
      o("salmiya", "pin", "Salmiya", "السالمية"),
      o("hawally", "pin", "Hawally", "حولي"),
      o("jahra", "pin", "Jahra", "الجهراء"),
      o("ahmadi", "pin", "Ahmadi", "الأحمدي"),
      o("farwaniya", "pin", "Farwaniya", "الفروانية"),
      o("online", "globe", "Online only", "أونلاين فقط"),
      o("all", "map", "All of Kuwait", "الكويت كلها"),
    ],
  },
];
