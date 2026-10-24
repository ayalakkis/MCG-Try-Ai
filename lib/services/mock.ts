/**
 * Offline mocks using the sample content from design/ (Bloom Coffee, Salmiya, "The 5 PM Reset").
 * Used when USE_MOCKS=true, or when no GEMINI_API_KEY is configured (see next.config.ts).
 */
import { EXAMPLES } from "../examples";
import type { Conversation, EmailService, LeadService, Services, SpeechToText, StrategyService, TextToSpeech } from "./interfaces";
import type { Brief, BriefField, ConversationInput, ConversationTurn, LevelListener, ListenOptions, Localized, QuickAnswer, Strategy } from "./types";
import { BRIEF_FIELDS } from "./types";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const L = (en: string, ar: string): Localized => ({ en, ar });

/** Sample visitor utterance from 02-listening (AR: what a Kuwaiti visitor might say; only the bot speaks Fusha). */
export const SAMPLE_CAPTION: Localized = {
  en: "I have a specialty coffee shop in Salmiya, and I want more people in the evenings",
  ar: "عندي مقهى مختص بالسالمية، وأبي ناس أكثر بالمسا",
};

/** What the mock "hears" when the visitor answers a specific question by voice (03-conversation quote). */
const SAMPLE_ANSWERS: Record<BriefField, Localized> = {
  business: L("A specialty coffee shop.", "مقهى مختص."),
  goal: L("More people in the evenings.", "ناس أكثر بالمسا."),
  audience: L("Young professionals, right after work.", "موظفين شباب، بعد الدوام."),
  location: L("Salmiya.", "السالمية."),
};

const SAMPLE_BRIEF = EXAMPLES.cafe;

interface Step {
  field: BriefField;
  question: Localized;
  quickAnswers: QuickAnswer[];
}

const q = (id: string, en: string, ar: string, value?: Localized): QuickAnswer => ({ id, label: L(en, ar), value });

/** One question per brief field. business/goal/location usually come from the first utterance. */
const STEPS: Step[] = [
  {
    field: "business",
    question: L("What kind of business do you have?", "ما نوع مشروعك؟"),
    quickAnswers: [q("cafe", "Café", "مقهى"), q("restaurant", "Restaurant", "مطعم"), q("retail", "Retail shop", "متجر"), q("online", "Online store", "متجر إلكتروني")],
  },
  {
    field: "goal",
    question: L("What should your marketing achieve?", "ما الذي تريد أن يحققه تسويقك؟"),
    quickAnswers: [q("visits", "More visits", "زيارات أكثر"), q("sales", "More sales", "مبيعات أكثر"), q("awareness", "Awareness", "شهرة أوسع"), q("launch", "New launch", "إطلاق جديد")],
  },
  {
    field: "audience",
    question: L("Who do you want to reach?", "من الجمهور الذي تريد الوصول إليه؟"),
    quickAnswers: [
      q("young", "Young professionals", "موظفون شباب", L("Young pros", "موظفون شباب")),
      q("students", "Students", "طلاب"),
      q("families", "Families", "العائلات"),
      q("everyone", "Everyone", "الجميع"),
    ],
  },
  {
    field: "location",
    question: L("Where are you based?", "أين يقع مشروعك؟"),
    quickAnswers: [q("salmiya", "Salmiya", "السالمية"), q("kuwait-city", "Kuwait City", "العاصمة"), q("hawalli", "Hawalli", "حولي"), q("online-only", "Online only", "عبر الإنترنت فقط")],
  },
];

/** Map an answer back to brief values: quick-answer labels, or the first utterance fills several fields. */
function extract(field: BriefField | null, answer: string, filled: number): Brief {
  if (filled === 0) {
    // First spoken answer (sample caption) covers business, goal and location.
    return { business: SAMPLE_BRIEF.business, goal: SAMPLE_BRIEF.goal, location: SAMPLE_BRIEF.location, brandName: SAMPLE_BRIEF.brandName };
  }
  if (!field) return {};
  const step = STEPS.find((s) => s.field === field);
  const quick = step?.quickAnswers.find((a) => a.label.en === answer || a.label.ar === answer || a.id === answer);
  if (quick) return { [field]: quick.value ?? quick.label };
  return { [field]: SAMPLE_BRIEF[field] };
}

class MockSpeechToText implements SpeechToText {
  private timer: ReturnType<typeof setInterval> | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private text = "";
  private caption = SAMPLE_CAPTION.en;

  async start(onPartial: (t: string) => void, onFinal: (t: string) => void, onLevel: LevelListener, options: ListenOptions = {}) {
    this.cancel();
    const lang = options.lang ?? "en";
    this.caption = (options.expect ? SAMPLE_ANSWERS[options.expect] : SAMPLE_CAPTION)[lang];
    const words = this.caption.split(" ");
    let i = 0;
    this.text = "";
    // Last 3 words stay "interim" (faded) until finalised, like a real streaming recogniser.
    this.timer = setInterval(() => {
      i = Math.min(i + 1, words.length);
      const finalCount = Math.max(0, i - 3);
      onFinal(words.slice(0, finalCount).join(" "));
      onPartial(words.slice(finalCount, i).join(" "));
      this.text = words.slice(0, i).join(" ");
      if (i >= words.length && this.timer) clearInterval(this.timer);
    }, 260);
    let t = 0;
    this.levelTimer = setInterval(() => {
      t += 1;
      onLevel(Math.max(0, Math.min(1, 0.45 + 0.35 * Math.sin(t / 2.3) + (Math.random() - 0.5) * 0.4)));
    }, 60);
  }

  async stop() {
    const text = this.text;
    this.cancel();
    return text;
  }

  cancel() {
    if (this.timer) clearInterval(this.timer);
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.timer = this.levelTimer = null;
  }
}

class MockConversation implements Conversation {
  async next({ brief, lastAnswer }: ConversationInput): Promise<ConversationTurn> {
    await wait(600);
    const filledBefore = BRIEF_FIELDS.filter((f) => brief[f]).length;
    const asking = BRIEF_FIELDS.find((f) => !brief[f]) ?? null;
    const briefUpdates = lastAnswer != null ? extract(asking, lastAnswer, filledBefore) : {};
    const merged: Brief = { ...brief, ...briefUpdates };
    const nextField = BRIEF_FIELDS.find((f) => !merged[f]) ?? null;
    const step = STEPS.find((s) => s.field === nextField);
    return {
      question: step?.question ?? L("Got it. Let's build it.", "حسناً. لنبدأ ببنائها."),
      asking: nextField,
      quickAnswers: step?.quickAnswers ?? [],
      // Once the brief is complete the AI also hands over the keywords it heard.
      briefUpdates: nextField === null ? { ...briefUpdates, keywords: SAMPLE_BRIEF.keywords } : briefUpdates,
      done: nextField === null,
    };
  }
}

class MockTextToSpeech implements TextToSpeech {
  private timer: ReturnType<typeof setInterval> | null = null;
  private done: (() => void) | null = null;

  speak(text: string, _lang = "ar-KW", onLevel?: LevelListener) {
    this.stop();
    const duration = Math.min(4000, 900 + text.length * 45);
    return new Promise<void>((resolve) => {
      let t = 0;
      this.done = resolve;
      this.timer = setInterval(() => {
        t += 50;
        // Syllable-ish envelope.
        onLevel?.(Math.max(0, Math.abs(Math.sin(t / 110)) * (0.6 + 0.4 * Math.sin(t / 470))));
        if (t >= duration) this.stop();
      }, 50);
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const d = this.done;
    this.done = null;
    d?.();
  }
}

/** Bloom Coffee (Salmiya, evening visits): the offline demo strategy, one idea per department. */
export const SAMPLE_STRATEGY: Strategy = {
  id: "mock-bloom-strategy",
  headline: L("Make Bloom Salmiya's after-work ritual", "اجعل بلوم طقس السالمية بعد العمل"),
  summary: L(
    "People know Bloom as a morning grab, not an evening place. Own the 5 to 8 PM switch-off moment for Salmiya's young professionals.",
    "يعرف الناس بلوم مكاناً لقهوة الصباح، لا وجهةً للمساء. لنمتلك لحظة الاسترخاء من ٥ إلى ٨ مساءً لشباب السالمية بعد العمل.",
  ),
  objective: L("More weekday evening regulars", "روّاد مسائيون دائمون في أيام العمل"),
  funnelStage: L("Loyalty", "الولاء"),
  audience: L("Young professionals heading home from work", "موظفون شباب في طريقهم من العمل"),
  marketing: {
    title: L("The 5 PM Reset", "استراحة الخامسة"),
    idea: L(
      "Position Bloom as the calm stop between the office and home: slower cups, quiet tables and a menu that only exists after five.",
      "نجعل بلوم المحطة الهادئة بين المكتب والمنزل: قهوة على مهل، وطاولات هادئة، وقائمة لا تتوفر إلا بعد الخامسة.",
    ),
    points: [
      L("Launch an after-five menu: two signature drinks and one dessert.", "قائمة ما بعد الخامسة: مشروبان مميزان وحلوى واحدة."),
      L("Dim the lights and change the playlist at 5 PM every day.", "خفّف الإضاءة وغيّر الموسيقى في الساعة ٥ يومياً."),
      L("Show the 5 PM moment on the cups, menu board and Google Maps photos.", "أبرِز لحظة الخامسة على الأكواب ولوحة القائمة وصور خرائط جوجل."),
    ],
  },
  socialMedia: {
    title: L("Own the 5 PM feed", "محتوى الساعة ٥"),
    idea: L("Post at the moment people decide: the end of the workday, from the café itself.", "ننشر في لحظة اتخاذ القرار: نهاية يوم العمل، ومن داخل المقهى."),
    platforms: [
      { name: L("Instagram", "إنستغرام"), role: L("A daily 5 PM Reel of the first evening pour.", "مقطع ريلز يومي في الساعة ٥ لأول كوب مسائي.") },
      { name: L("Snapchat", "سناب شات"), role: L("4:45 PM stories: today's drink and how busy it is.", "قصص الساعة ٤:٤٥: مشروب اليوم ومدى الازدحام.") },
      { name: L("Google Maps", "خرائط جوجل"), role: L("Evening photos and hours to win 'coffee near me'.", "صور مسائية ومواعيد العمل للظهور في بحث «قهوة قريبة».") },
    ],
  },
  influencers: {
    title: L("Office escape stories", "استراحة من المكتب"),
    idea: L(
      "Creators who work in Salmiya film the walk from their desk to Bloom, then their first sip, in one honest take.",
      "صنّاع محتوى يعملون في السالمية يصوّرون الطريق من مكاتبهم إلى بلوم وأول رشفة، في لقطة واحدة صادقة.",
    ),
    mix: L("5 micro creators + 1 lifestyle name", "٥ مؤثرين صغار + شخصية لأسلوب الحياة"),
    points: [
      L("Each creator posts one Reel and three stories over two weeks.", "ينشر كل صانع محتوى مقطع ريلز و٣ قصص خلال أسبوعين."),
      L("Give each a personal code their followers can use after 5 PM.", "رمز خاص لكل منهم يستخدمه متابعوه بعد الخامسة."),
    ],
  },
  event: {
    title: L("Sunset cupping nights", "أمسيات التذوق عند الغروب"),
    idea: L(
      "A free Wednesday coffee tasting at sunset where neighbours and office crowds meet the baristas and try new beans.",
      "جلسة تذوق قهوة مجانية كل أربعاء عند الغروب، يلتقي فيها الجيران والموظفون بالباريستا ويجرّبون محاصيل جديدة.",
    ),
    when: L("Wednesdays, winter season", "كل أربعاء، موسم الشتاء"),
    points: [
      L("12 seats, booked through WhatsApp to keep it personal.", "١٢ مقعداً، والحجز عبر واتساب ليبقى الطابع شخصياً."),
      L("Guests leave with a 5 PM card to start their habit.", "يغادر كل ضيف ببطاقة الخامسة ليبدأ عادته الجديدة."),
    ],
  },
  activation: {
    title: L("The 5 PM tasting bar", "ركن التذوق في الخامسة"),
    idea: L(
      "A free evening tasting bar in the office towers next door, Sunday to Wednesday at 5 PM: three new cold brews and a card for the walk over.",
      "ركن تذوق مجاني في أبراج المكاتب المجاورة، من الأحد إلى الأربعاء في الخامسة مساءً: ثلاثة مشروبات باردة جديدة وبطاقة تدعوهم إلى المقهى.",
    ),
    points: [
      L("Agree with two building managers on a lobby spot and a 45-minute slot.", "الاتفاق مع إدارتي برجين على مكان في الردهة ومدة ٤٥ دقيقة."),
      L("Each card carries a QR code, so you see which tower brings people in.", "تحمل كل بطاقة رمز QR لتعرف أي برج يجلب الزوار."),
    ],
    offers: [
      L("5 PM card: every fifth evening cup is on Bloom.", "بطاقة الخامسة: الكوب المسائي الخامس على حساب بلوم."),
      L("Bring a colleague after five: their drink is half price.", "أحضِر زميلك بعد الخامسة: مشروبه بنصف السعر."),
    ],
  },
  budget: {
    monthlyMin: 600,
    monthlyMax: 1200,
    split: [
      { channel: L("Instagram & TikTok ads", "إعلانات إنستغرام وتيك توك"), percent: 40 },
      { channel: L("Creators", "صنّاع المحتوى"), percent: 30 },
      { channel: L("Snapchat ads", "إعلانات سناب شات"), percent: 20 },
      { channel: L("Google Maps", "خرائط جوجل"), percent: 10 },
    ],
    note: L("Run ads only from 3:30 to 7:30 PM within 5 km of the café.", "اعرض الإعلانات فقط من ٣:٣٠ إلى ٧:٣٠ مساءً وضمن ٥ كم من المقهى."),
  },
  nextStep: L(
    "Let's sit with the MCG team and turn this into Bloom's first month of evenings.",
    "لنجلس مع فريق MCG ونحوّل هذا إلى أول شهر من الأمسيات في بلوم.",
  ),
  keywords: SAMPLE_BRIEF.keywords,
};

class MockStrategy implements StrategyService {
  async generate() {
    await wait(1200);
    return SAMPLE_STRATEGY;
  }
}

class MockEmail implements EmailService {
  async send() {
    await wait(900);
    return { ok: true as const, id: "mock-email" };
  }
}

class MockLeads implements LeadService {
  async save() {
    return false;
  }
}

export function createMockServices(): Services {
  return {
    stt: new MockSpeechToText(),
    conversation: new MockConversation(),
    tts: new MockTextToSpeech(),
    strategy: new MockStrategy(),
    email: new MockEmail(),
    leads: new MockLeads(),
  };
}
