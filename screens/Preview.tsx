"use client";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import Header from "@/components/Header";
import { MailIcon } from "@/components/icons";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import type { Brief, Localized, Strategy } from "@/lib/services/types";
import s from "./Preview.module.css";

type Dept = "marketing" | "socialMedia" | "influencers" | "event" | "activation";
const DEPTS: Dept[] = ["marketing", "socialMedia", "influencers", "event", "activation"];

/** Flat cartoon illustrations in public/illustrations/ (drawn in MCG's colours, no text). */
const ART: Record<Dept, string> = {
  marketing: "/illustrations/marketing.svg",
  socialMedia: "/illustrations/social.svg",
  influencers: "/illustrations/influencers.svg",
  event: "/illustrations/event.svg",
  activation: "/illustrations/activation.svg",
};

interface PreviewProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  strategy: Strategy;
  brief: Brief;
  onEmail: () => void;
  onNotNow: () => void;
}

/**
 * RESULT (design/screens/05-result.html): an illustrated hero with the strategy line and its facts,
 * then one card per department. Each card shows its cartoon illustration, title and one line;
 * tapping it swaps the picture for the practical points. The email carries the full strategy.
 */
export default function Preview({ t, lang, onLang, onStartOver, strategy, brief, onEmail, onNotNow }: PreviewProps) {
  const [open, setOpen] = useState<Dept | null>(null);
  const L = (x: Localized | undefined) => x?.[lang] ?? "";
  const p = t.preview;
  const facts: { label: string; value: string }[] = [
    { label: p.params.business, value: [brief.brandName, L(brief.business)].filter(Boolean).join(" · ") },
    { label: p.params.area, value: L(brief.location) },
    { label: p.params.objective, value: L(strategy.objective) },
    { label: p.params.focus, value: L(strategy.funnelStage) },
  ].filter((f) => f.value);

  const points = (d: Dept): Localized[] =>
    d === "socialMedia" ? strategy.socialMedia.platforms.map((x) => ({ en: `${x.name.en}: ${x.role.en}`, ar: `${x.name.ar}: ${x.role.ar}` })) : strategy[d].points;

  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <section className={s.hero}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
          <img className={s.heroArt} src="/illustrations/hero.svg" alt="" />
          <div className={s.heroTop}>
            <span className={s.yourStrategy}>{p.yourStrategy}</span>
            <h1 className={s.headline}>{L(strategy.headline)}</h1>
          </div>
          <dl className={s.facts}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={s.cards}>
          {DEPTS.map((d) => {
            const isOpen = open === d;
            return (
              <button key={d} type="button" className={isOpen ? `${s.card} ${s.cardOn}` : s.card} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : d)}>
                <div className={s.vis}>
                  {isOpen ? (
                    <ul className={s.points}>
                      {points(d)
                        .slice(0, 2)
                        .map((x, i) => (
                          <li key={i}>{L(x)}</li>
                        ))}
                    </ul>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed
                    <img className={s.art} src={ART[d]} alt="" />
                  )}
                </div>
                <div className={s.txt}>
                  <span className={s.dept}>{p.depts[d]}</span>
                  <h3>{L(strategy[d].title)}</h3>
                  <p>{L(strategy[d].idea)}</p>
                </div>
              </button>
            );
          })}
        </section>

        <div className={s.actions}>
          <PrimaryButton className={s.email} onClick={onEmail}>
            <MailIcon />
            {p.emailMe}
          </PrimaryButton>
          <SecondaryButton className={s.notNow} onClick={onNotNow}>
            {p.notNow}
          </SecondaryButton>
          <span className={s.tapHint}>{p.tapHint}</span>
        </div>
      </div>
    </Canvas>
  );
}
