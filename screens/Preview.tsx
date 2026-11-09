"use client";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import Header from "@/components/Header";
import { CloseIcon, MailIcon } from "@/components/icons";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import type { Brief, Localized, Strategy } from "@/lib/services/types";
import s from "./Preview.module.css";

/** Two curved arrows: "turn this card over". */
const FlipIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 10.5A7.5 7.5 0 0 1 17.6 6.4M18.5 3v4h-4M19.5 13.5A7.5 7.5 0 0 1 6.4 17.6M5.5 21v-4h4" />
  </svg>
);

/**
 * Pointing hand that taps the flip badge on the first card: the outline of Lucide's "pointer" icon (MIT),
 * closed and filled. Mirrored so the palm sits inside the card; the fingertip is at (16, 2) of the 24×24 box.
 */
const TapHand = () => (
  <svg className={s.hand} viewBox="0 0 24 24" aria-hidden="true">
    <g transform="matrix(-1 0 0 1 24 0)" stroke="#144074" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path
        fill="#FFDCC0"
        d="M6 14V4a2 2 0 0 1 4 0v5a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 14z"
      />
      <path fill="none" d="M10 9v3.5M14 10v2.5M18 11v2" />
    </g>
  </svg>
);

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
  /** The tapping-hand hint on the first card shows until the visitor taps any card. */
  const [touched, setTouched] = useState(false);
  /** Cards that have been turned at least once: only these play the flip (so nothing animates on arrival). */
  const [turned, setTurned] = useState<Dept[]>([]);
  const toggle = (d: Dept) => {
    setTouched(true);
    setTurned((t) => [...new Set([...t, d, ...(open ? [open] : [])])]);
    setOpen(open === d ? null : d);
  };
  const L = (x: Localized | undefined) => x?.[lang] ?? "";
  const p = t.preview;
  const facts: { label: string; value: string }[] = [
    { label: p.params.business, value: [brief.brandName, L(brief.business)].filter(Boolean).join(" · ") },
    { label: p.params.area, value: L(brief.location) },
    { label: p.params.objective, value: L(strategy.objective) },
    { label: p.params.focus, value: L(strategy.funnelStage) },
  ].filter((f) => f.value);

  /** Up to 2 practical points per card; social media leads each with its platform name. */
  const points = (d: Dept): { lead?: string; text: string }[] =>
    (d === "socialMedia"
      ? strategy.socialMedia.platforms.map((x) => ({ lead: L(x.name), text: L(x.role) }))
      : strategy[d].points.map((x) => ({ text: L(x) }))
    ).slice(0, 2);

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
              <button
                key={d}
                type="button"
                className={[s.card, isOpen && s.cardOn, turned.includes(d) && s.turned].filter(Boolean).join(" ")}
                aria-expanded={isOpen}
                onClick={() => toggle(d)}
              >
                <div className={s.inner}>
                  <div className={`${s.face} ${s.back}`} aria-hidden={!isOpen}>
                    <div className={s.openHead}>
                      <div className={s.openTop}>
                        <span className={s.dept}>{p.depts[d]}</span>
                        <span className={s.close} aria-label={p.close}>
                          <CloseIcon />
                        </span>
                      </div>
                      <h3>{L(strategy[d].title)}</h3>
                    </div>
                    <ol className={s.points}>
                      {points(d).map((x, i) => (
                        <li key={i}>
                          {x.lead && <strong>{x.lead}</strong>}
                          {x.text}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className={`${s.face} ${s.front}`} aria-hidden={isOpen}>
                    <div className={s.vis}>
                      <span className={s.more} aria-hidden="true">
                        <FlipIcon />
                      </span>
                      {d === DEPTS[0] && !touched && (
                        <>
                          <span className={s.tapRing} aria-hidden="true" />
                          <TapHand />
                        </>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
                      <img className={s.art} src={ART[d]} alt="" />
                    </div>
                    <div className={s.txt}>
                      <span className={s.dept}>{p.depts[d]}</span>
                      <h3>{L(strategy[d].title)}</h3>
                      <p>{L(strategy[d].idea)}</p>
                    </div>
                  </div>
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
        </div>
      </div>
    </Canvas>
  );
}
