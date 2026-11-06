/**
 * All UI copy, EN + AR. Components never hard-code strings.
 * Arabic copy comes from design/reference/rtl-arabic-*.html and orb-states-and-errors.html
 * for layout; at MCG's request all Arabic copy is Modern Standard Arabic (Fusha), not Kuwaiti dialect.
 * Drafts to be reviewed by MCG.
 */

export type Lang = "en" | "ar";

export const LANGS: Record<Lang, { dir: "ltr" | "rtl"; label: string; htmlLang: string; speechLang: string }> = {
  en: { dir: "ltr", label: "EN", htmlLang: "en", speechLang: "en-US" },
  ar: { dir: "rtl", label: "عربي", htmlLang: "ar", speechLang: "ar-KW" },
};

const en = {
  common: {
    startOver: "Start over",
    logoAlt: "MCG",
    /** Live timer label while the AI works. */
    elapsed: "Time elapsed",
  },
  welcome: {
    hello: "Hello",
    headline: "Tell us about your business. We'll build your strategy.",
    sub: "Answer five quick questions and get a marketing strategy built for your business in about a minute.",
    start: "Let's start",
    covers: "Every strategy covers",
    tagline: "Advertising. Content. Events. AI.",
  },
  questions: {
    yourBrief: "Your brief",
    counter: (n: number, total: number) => `Question ${n} of ${total}`,
    lastStep: "Last step",
    nowLabel: "Next",
    hint: "Pick one or more · add your own if you like",
    otherPlaceholder: "Something else? Type it here",
    next: "Next",
    brandTitle: "What's your business called?",
    brandPlaceholder: "Business name",
    brandHint: "Optional · it makes the strategy yours",
    create: "Create my strategy",
    skip: "Skip",
    back: "Back",
  },
  create: {
    watchUsCreate: "Watch us create",
    takes: "This takes about 20 seconds",
    building: "Building your strategy",
    stages: ["Your brief", "Marketing & social media", "Influencers & events", "Activations & offers"],
    progress: "Progress",
  },
  preview: {
    yourStrategy: "Your strategy",
    parameters: "Strategy parameters",
    params: {
      business: "Business",
      area: "Area",
      objective: "Goal",
      audience: "Audience",
      focus: "Focus",
    },
    depts: {
      marketing: "Marketing",
      socialMedia: "Social media",
      influencers: "Influencers",
      event: "Event",
      activation: "Activation & offers",
    },
    platforms: "Platforms",
    creators: "Creators",
    when: "When",
    offers: "Offers",
    howItRuns: "How it runs",
    close: "Close",
    stages: { awareness: "Awareness", consideration: "Consideration", conversion: "Conversion", loyalty: "Loyalty", advocacy: "Advocacy" },
    offer: "Offer",
    tapHint: "Tap a card to see more",
    emailMe: "Email me the full strategy",
    notNow: "Not now",
  },
  email: {
    almostDone: "Almost done",
    whereSend: "Where should we send it?",
    email: "Email",
    name: "Name",
    optional: "(optional)",
    consent: "MCG can contact me",
    send: "Send",
    sending: "Sending…",
    neverShare: "We never share your email",
    privacy: "Privacy",
    /** Inline invalid-email state (orb-states-and-errors.html). */
    checkDomain: "Check the part after @",
    missingAt: "Add the part with @",
    suggest: (domain: string) => `${domain}?`,
    /** Spoken when the screen opens, in the screen language. */
    spoken: "Where should we send it?",
    // TODO(MCG legal): review the privacy note.
    privacyTitle: "Your privacy",
    privacyBody:
      "We use your email only to send you this strategy. If you tick “MCG can contact me”, our team may follow up about it. We never share or sell your details.",
    close: "Close",
  },
  thanks: {
    thankYou: (name: string) => (name ? `Thank you, ${name}` : "Thank you"),
    onItsWay: "It's on its way.",
    makeItHappen: "Let's make it happen",
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    whatsappQr: "WhatsApp QR code",
    instagramQr: "Instagram QR code",
  },
  /** The strategy email (emails/StrategyEmail*.tsx; design/reference/email-en.html). */
  mail: {
    subject: "Your marketing strategy from MCG",
    logoAlt: "MCG · innovative · integrated · inspiring",
    topRight: "Your marketing strategy",
    hello: (name: string) => (name ? `Hello ${name},` : "Hello,"),
    headline: (brand: string) => (brand ? `Your marketing strategy for ${brand}` : "Your marketing strategy"),
    intro: "Here's the strategy we built from your answers at MCG's booth, the same one you saw on screen. Every part of it can go further with our team.",
    strategy: "The strategy",
    ctaTitle: ["Want to make this real?", "Let's talk."],
    ctaBody: "MCG's team can build this with you: content, creators, events, activations and AI.",
    whatsapp: "Chat on WhatsApp",
    instagram: "MCG on Instagram",
    website: "Visit mcgmasters.com",
    footerBrand: "MCG · Advertising. Content. Events. AI.",
    footerNote: (event: string) =>
      `You're receiving this because you asked for your strategy at MCG's booth at ${event}, Kuwait. This strategy was drafted by AI from your answers, so please review the details before acting on it.`,
    unsubscribe: "Unsubscribe",
  },
  errors: {
    netLabel: "Network issue",
    netTitle: "Reconnecting",
    netBody: "Your brief is saved.",
    retrying: "Retrying…",
    retryNow: "Retry now",
    sendLabel: "Email issue",
    sendTitle: "We couldn't send it",
    sendBody: "Please ask the MCG team at the booth for a copy.",
    back: "Back",
    idleLabel: "Inactivity timeout",
    idleTitle: "Still there?",
    idleBody: (n: number) => `Starting over in ${n}s.`,
    imHere: "I'm here",
  },
};

export type Dict = typeof en;

const ar: Dict = {
  common: {
    startOver: "البدء من جديد",
    logoAlt: "MCG",
    elapsed: "الوقت المنقضي",
  },
  welcome: {
    hello: "مرحباً",
    headline: "حدّثنا عن مشروعك، وسنبني لك استراتيجيتك.",
    sub: "أجب عن خمسة أسئلة سريعة واحصل على استراتيجية تسويقية مصممة لمشروعك في نحو دقيقة.",
    start: "لنبدأ",
    covers: "تشمل كل استراتيجية",
    tagline: "إعلانات. محتوى. فعاليات. ذكاء اصطناعي.",
  },
  questions: {
    yourBrief: "مشروعك",
    counter: (n: number, total: number) => `السؤال ${n} من ${total}`,
    lastStep: "الخطوة الأخيرة",
    nowLabel: "التالي",
    hint: "اختر إجابة أو أكثر · وأضف ما تريد",
    otherPlaceholder: "شيء آخر؟ اكتبه هنا",
    next: "التالي",
    brandTitle: "ما اسم مشروعك؟",
    brandPlaceholder: "اسم المشروع",
    brandHint: "اختياري · ليصبح كل شيء باسمك",
    create: "أنشئ استراتيجيتي",
    skip: "تخطَّ",
    back: "رجوع",
  },
  create: {
    watchUsCreate: "شاهدنا نصنعها",
    takes: "يستغرق ذلك نحو 20 ثانية",
    building: "نبني استراتيجيتك الآن",
    stages: ["مشروعك", "التسويق ووسائل التواصل", "المؤثرون والفعاليات", "الأنشطة والعروض"],
    progress: "التقدّم",
  },
  preview: {
    yourStrategy: "استراتيجيتك",
    parameters: "تفاصيل الاستراتيجية",
    params: {
      business: "النشاط",
      area: "المنطقة",
      objective: "الهدف",
      audience: "الجمهور",
      focus: "التركيز",
    },
    depts: {
      marketing: "التسويق",
      socialMedia: "وسائل التواصل الاجتماعي",
      influencers: "المؤثرون",
      event: "الفعالية",
      activation: "الأنشطة والعروض",
    },
    platforms: "المنصات",
    creators: "صنّاع المحتوى",
    when: "الموعد",
    offers: "العروض",
    howItRuns: "طريقة التنفيذ",
    close: "إغلاق",
    stages: { awareness: "الوعي", consideration: "الاهتمام", conversion: "الشراء", loyalty: "الولاء", advocacy: "التوصية" },
    offer: "العرض",
    tapHint: "اضغط على بطاقة لمعرفة المزيد",
    emailMe: "أرسلوا إليّ الاستراتيجية كاملة",
    notNow: "ليس الآن",
  },
  email: {
    almostDone: "أوشكنا على الانتهاء",
    whereSend: "إلى أين نرسلها؟",
    email: "البريد الإلكتروني",
    name: "الاسم",
    optional: "(اختياري)",
    consent: "أوافق على أن تتواصل معي MCG",
    send: "إرسال",
    sending: "جارٍ الإرسال…",
    neverShare: "لن نشارك بريدك الإلكتروني مع أحد",
    privacy: "الخصوصية",
    checkDomain: "تحقّق من الجزء الذي بعد @",
    missingAt: "أضف الجزء الذي يحتوي على @",
    suggest: (domain: string) => `${domain}؟`,
    spoken: "إلى أين نرسلها؟",
    privacyTitle: "خصوصيتك",
    privacyBody:
      "نستخدم بريدك الإلكتروني فقط لإرسال هذه الاستراتيجية إليك. وإذا اخترت «أوافق على أن تتواصل معي MCG»، فقد يتواصل معك فريقنا بشأنها. لن نشارك بياناتك أو نبيعها.",
    close: "إغلاق",
  },
  thanks: {
    thankYou: (name: string) => (name ? `شكراً، ${name}` : "شكراً"),
    onItsWay: "إنها في طريقها إليك.",
    makeItHappen: "لنجعلها واقعاً",
    whatsapp: "واتساب",
    instagram: "إنستغرام",
    whatsappQr: "رمز QR للواتساب",
    instagramQr: "رمز QR للإنستغرام",
  },
  mail: {
    subject: "استراتيجيتك التسويقية من MCG",
    logoAlt: "MCG · innovative · integrated · inspiring",
    topRight: "استراتيجيتك التسويقية",
    hello: (name: string) => (name ? `مرحباً ${name}،` : "مرحباً،"),
    headline: (brand: string) => (brand ? `استراتيجيتك التسويقية لـ ${brand}` : "استراتيجيتك التسويقية"),
    intro: "إليك الاستراتيجية التي أعددناها من إجاباتك في جناح MCG، وهي نفسها التي رأيتها على الشاشة. ويمكننا تطوير كل جزء منها أكثر مع فريقنا.",
    strategy: "الاستراتيجية",
    ctaTitle: ["هل تريد تطبيقها فعلاً؟", "لنتحدّث."],
    ctaBody: "يستطيع فريق MCG بناءها معك: المحتوى، وصنّاع المحتوى، والفعاليات، والأنشطة، والذكاء الاصطناعي.",
    whatsapp: "تواصل معنا عبر واتساب",
    instagram: "تابع MCG على إنستغرام",
    website: "زوروا موقعنا mcgmasters.com",
    footerBrand: "MCG · إعلانات. محتوى. فعاليات. ذكاء اصطناعي.",
    footerNote: (event: string) =>
      `وصلتك هذه الرسالة لأنك طلبت استراتيجيتك من جناح MCG في ${event}، الكويت. أعدّ الذكاء الاصطناعي هذه الاستراتيجية من إجاباتك، لذا يُرجى مراجعة التفاصيل قبل الاعتماد عليها.`,
    unsubscribe: "إلغاء الاشتراك",
  },
  errors: {
    netLabel: "مشكلة في الشبكة",
    netTitle: "جارٍ إعادة الاتصال",
    netBody: "إجاباتك محفوظة، لحظات ونعود.",
    retrying: "جارٍ المحاولة…",
    retryNow: "أعد المحاولة الآن",
    sendLabel: "مشكلة في البريد",
    sendTitle: "تعذّر إرسال الرسالة",
    sendBody: "يُرجى طلب نسخة من فريق MCG في الجناح.",
    back: "رجوع",
    idleLabel: "لا يوجد نشاط",
    idleTitle: "هل ما زلت هنا؟",
    // Arabic counted noun: 1 ثانية واحدة, 2 ثانيتين, 3–10 ثوانٍ, 11+ ثانية.
    idleBody: (n: number) =>
      `سنبدأ من جديد بعد ${n === 1 ? "ثانية واحدة" : n === 2 ? "ثانيتين" : n <= 10 ? `${n} ثوانٍ` : `${n} ثانية`}.`,
    imHere: "نعم، أنا هنا",
  },
};

export const dictionaries: Record<Lang, Dict> = { en, ar };

export function t(lang: Lang): Dict {
  return dictionaries[lang];
}
