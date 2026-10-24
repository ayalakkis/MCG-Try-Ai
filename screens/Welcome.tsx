"use client";
import BrandLine from "@/components/BrandLine";
import { PrimaryButton } from "@/components/Buttons";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { MicIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import type { HoldButtonProps } from "@/lib/useHoldToTalk";
import s from "./Welcome.module.css";

interface WelcomeProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  /** Pointer/keyboard handlers that start hold-to-talk. */
  holdProps: HoldButtonProps;
}

/** design/screens/01-welcome.html without the Examples cards (removed at MCG's request). */
export default function Welcome({ t, lang, onLang, holdProps }: WelcomeProps) {
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
          <PrimaryButton className={s.talk} {...holdProps}>
            <MicIcon />
            {t.welcome.holdToTalk}
          </PrimaryButton>
        </div>
      </div>

      <footer className={s.footer}>{t.welcome.tagline}</footer>
    </Canvas>
  );
}
