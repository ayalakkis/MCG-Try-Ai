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

/** The five parts of the strategy, with the result screen's line illustrations. */
const DEPTS = [
  { key: "marketing", art: "marketing" },
  { key: "socialMedia", art: "social" },
  { key: "influencers", art: "influencers" },
  { key: "event", art: "event" },
  { key: "activation", art: "activation" },
] as const;

/**
 * design/screens/01-welcome.html, enriched at MCG's request: a short promise under the headline
 * and, along the bottom, the five parts every strategy covers (same icons as the result).
 */
export default function Welcome({ t, lang, onLang, onStart }: WelcomeProps) {
  const w = t.welcome;
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
      </div>

      <section className={s.covers}>
        <span className={s.coversLabel}>{w.covers}</span>
        <ul className={s.depts}>
          {DEPTS.map(({ key, art }) => (
            <li key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
              <img src={`/illustrations/${art}.svg`} alt="" />
              <span>{t.preview.depts[key]}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className={s.footer}>{w.tagline}</footer>
    </Canvas>
  );
}
