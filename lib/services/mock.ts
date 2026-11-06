/**
 * Offline mocks using the sample content from design/ (Bloom Coffee, Salmiya, "The 5 PM Reset").
 * Used when USE_MOCKS=true, or when no GEMINI_API_KEY is configured (see next.config.ts).
 */
import { EXAMPLES } from "../examples";
import type { EmailService, LeadService, Services, StrategyService, TextToSpeech } from "./interfaces";
import type { LevelListener, Localized, Strategy } from "./types";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const L = (en: string, ar: string): Localized => ({ en, ar });

const SAMPLE_BRIEF = EXAMPLES.cafe;

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
    tts: new MockTextToSpeech(),
    strategy: new MockStrategy(),
    email: new MockEmail(),
    leads: new MockLeads(),
  };
}
