"use client";
import BrandLine from "@/components/BrandLine";
import { PrimaryButton } from "@/components/Buttons";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { ArrowIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import s from "./Welcome.module.css";

interface WelcomeProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStart: () => void;
}

/** design/screens/01-welcome.html without the Examples cards; "Let's start" opens the questions (no voice). */
export default function Welcome({ t, lang, onLang, onStart }: WelcomeProps) {
  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} />

      <div className={s.body}>
        <div className={s.visual}>
          <BrandLine variant="welcome" className={s.line} />
          <Orb state="idle" size={340} />
        </div>

        <div className={s.content}>
          <div className={`grad ${s.hello}`}>
            {t.welcome.hello}
            <GreetingDots />
          </div>
          <h1 className={s.headline}>{t.welcome.headline}</h1>
          <PrimaryButton className={s.talk} onClick={onStart}>
            {t.welcome.start}
            <ArrowIcon className={s.arrow} />
          </PrimaryButton>
        </div>
      </div>

      <footer className={s.footer}>{t.welcome.tagline}</footer>
    </Canvas>
  );
}
