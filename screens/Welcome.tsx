"use client";
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

/**
 * WELCOME: a centred, minimal composition. The orb on a soft glow, a large centred promise and
 * one button, and MCG's brand line sweeping across the page.
 */
export default function Welcome({ t, lang, onLang, onStart }: WelcomeProps) {
  const w = t.welcome;
  return (
    <Canvas style={{ background: "radial-gradient(ellipse 70% 55% at 50% 22%, #E3F1FB 0%, rgba(227,241,251,0) 70%), #ffffff", overflow: "hidden" }}>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} />

      {/* Brand line: pink dot, a long sweep under the content, orange dot */}
      <svg className={s.sweep} viewBox="0 0 1270 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M20 250 C 240 250, 300 120, 520 150 S 860 280, 1040 170 S 1220 60, 1250 70" fill="none" stroke="#144074" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx="20" cy="250" r="9" fill="#E5418C" />
        <circle cx="1250" cy="70" r="9" fill="#EF8E0A" />
      </svg>

      <div className={s.body}>
        <div className={s.orbWrap}>
          <i className={s.glow} aria-hidden="true" />
          <Orb state="idle" size={190} />
        </div>
        <div className={`grad ${s.hello}`}>
          {w.hello}
          <GreetingDots />
        </div>
        <h1 className={s.headline}>{w.headline}</h1>
        <p className={s.sub}>{w.sub}</p>
        <PrimaryButton className={s.talk} onClick={onStart}>
          {w.start}
          <ArrowIcon className={s.arrow} />
        </PrimaryButton>
      </div>

      <footer className={s.footer}>{w.tagline}</footer>
    </Canvas>
  );
}
