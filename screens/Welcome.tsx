"use client";
import BrandLine from "@/components/BrandLine";
import { PrimaryButton } from "@/components/Buttons";
import Chip from "@/components/Chip";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { ArrowIcon, CalendarIcon, GiftIcon, MailIcon, MegaphoneIcon, PhoneIcon, StarIcon } from "@/components/icons";
import OptionIcon from "@/components/OptionIcon";
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

/** The five departments the strategy covers, floating around the orb (same order as the result). */
const DEPTS = [
  { key: "marketing", Icon: MegaphoneIcon },
  { key: "socialMedia", Icon: PhoneIcon },
  { key: "influencers", Icon: StarIcon },
  { key: "event", Icon: CalendarIcon },
  { key: "activation", Icon: GiftIcon },
] as const;

/**
 * design/screens/01-welcome.html, enriched at MCG's request: the departments the strategy
 * covers orbit the orb, and a three-step "how it works" row sits under "Let's start".
 */
export default function Welcome({ t, lang, onLang, onStart }: WelcomeProps) {
  const w = t.welcome;
  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} />

      <div className={s.body}>
        <div className={s.visual}>
          <i className={s.halo} aria-hidden="true" />
          <i className={`${s.ring} ${s.ring1}`} aria-hidden="true" />
          <i className={`${s.ring} ${s.ring2}`} aria-hidden="true" />
          <BrandLine variant="welcome" className={s.line} />
          <Orb state="idle" size={300} />
          {DEPTS.map(({ key, Icon }, i) => (
            <Chip key={key} floating className={`${s.chip} ${s[`chip${i}`]}`} style={{ animationDelay: `${i * 0.6}s` }}>
              <Icon className={s.chipIcon} />
              {t.preview.depts[key]}
            </Chip>
          ))}
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

          <ol className={s.steps}>
            {w.steps.map((label, i) => (
              <li key={i}>
                <span className={s.stepIcon}>
                  {i === 0 ? <OptionIcon name="compass" /> : i === 1 ? <OptionIcon name="sparkle" /> : <MailIcon />}
                </span>
                <span className={s.stepNum}>{i + 1}</span>
                <span className={s.stepText}>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <footer className={s.footer}>{w.tagline}</footer>
    </Canvas>
  );
}
