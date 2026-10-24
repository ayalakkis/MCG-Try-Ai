"use client";
import { useState, type ReactNode } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { CalendarIcon, GiftIcon, MailIcon, MegaphoneIcon, PhoneIcon, StarIcon, WalletIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import type { Brief, Localized, Strategy } from "@/lib/services/types";
import s from "./Preview.module.css";

/** Budget split colours, darkest first (brand blues, then the accents). */
const SPLIT_COLORS = ["#144074", "#2694CF", "#8CC4E8", "#E5418C", "#EF8E0A"];

type Dept = "marketing" | "socialMedia" | "influencers" | "event" | "activation" | "budget";
const DEPTS: { key: Dept; Icon: typeof MegaphoneIcon }[] = [
  { key: "marketing", Icon: MegaphoneIcon },
  { key: "socialMedia", Icon: PhoneIcon },
  { key: "influencers", Icon: StarIcon },
  { key: "event", Icon: CalendarIcon },
  { key: "activation", Icon: GiftIcon },
  { key: "budget", Icon: WalletIcon },
];

const kwd = (n: number) => n.toLocaleString("en-US");

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
 * PREVIEW, redesigned for MCG: the strategy line and its parameters on top, then a list of
 * departments (marketing, social media, influencers, event, activation & offers, finance) next
 * to one spotlight showing the selected idea in full. Silent and untimed: the visitor reads at
 * their own pace and taps a department to open it. The email shows exactly this content.
 */
export default function Preview({ t, lang, onLang, onStartOver, strategy, brief, onEmail, onNotNow }: PreviewProps) {
  const [active, setActive] = useState(0);
  const L = (x: Localized | undefined) => x?.[lang] ?? "";
  const p = t.preview;
  const range = p.kwd(kwd(strategy.budget.monthlyMin), kwd(strategy.budget.monthlyMax));

  const facts: { label: string; value: string }[] = [
    { label: p.params.business, value: [brief.brandName, L(brief.business)].filter(Boolean).join(" · ") },
    { label: p.params.area, value: L(brief.location) },
    { label: p.params.objective, value: L(strategy.objective) },
    { label: p.params.focus, value: L(strategy.funnelStage) },
    { label: p.params.budget, value: `${range} ${p.perMonth}` },
  ].filter((f) => f.value);

  const titleOf = (d: Dept) => (d === "budget" ? range : L(strategy[d].title));
  const dept = DEPTS[active].key;

  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <section className={s.top}>
          <div className={s.intro}>
            <Orb state="idle" size={52} />
            <div className={`grad ${s.yourStrategy}`}>
              {p.yourStrategy}
              <GreetingDots />
            </div>
          </div>
          <h1 className={s.headline}>{L(strategy.headline)}</h1>
          <dl className={s.facts}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={s.explore}>
          <nav className={s.list} aria-label={p.parameters}>
            {DEPTS.map(({ key, Icon }, i) => (
              <button key={key} type="button" className={i === active ? s.itemOn : s.item} aria-current={i === active ? "true" : undefined} onClick={() => setActive(i)}>
                <span className={s.itemIcon}>
                  <Icon />
                </span>
                <span className={s.itemText}>
                  <span className={s.itemDept}>{p.depts[key]}</span>
                  <span className={s.itemTitle}>{titleOf(key)}</span>
                </span>
              </button>
            ))}
          </nav>

          <Spotlight key={dept} dept={dept} strategy={strategy} t={t} lang={lang} range={range} />
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

/** The selected department, in full. */
function Spotlight({ dept, strategy, t, lang, range }: { dept: Dept; strategy: Strategy; t: Dict; lang: Lang; range: string }) {
  const p = t.preview;
  const L = (x: Localized) => x[lang];
  const list = (items: Localized[]) => (
    <ul className={s.points}>
      {items.map((x, i) => (
        <li key={i}>{L(x)}</li>
      ))}
    </ul>
  );
  const fact = (label: string, value: string) => (
    <p className={s.fact}>
      <span>{label}</span>
      {value}
    </p>
  );

  let title: string;
  let idea: string;
  let body: ReactNode;
  switch (dept) {
    case "socialMedia":
      title = L(strategy.socialMedia.title);
      idea = L(strategy.socialMedia.idea);
      body = (
        <div className={s.rows}>
          {strategy.socialMedia.platforms.map((x, i) => (
            <div key={i} className={s.row}>
              <span className={s.rowKey}>{L(x.name)}</span>
              <span>{L(x.role)}</span>
            </div>
          ))}
        </div>
      );
      break;
    case "influencers":
      title = L(strategy.influencers.title);
      idea = L(strategy.influencers.idea);
      body = (
        <>
          {fact(p.creators, L(strategy.influencers.mix))}
          {list(strategy.influencers.points)}
        </>
      );
      break;
    case "event":
      title = L(strategy.event.title);
      idea = L(strategy.event.idea);
      body = (
        <>
          {fact(p.when, L(strategy.event.when))}
          {list(strategy.event.points)}
        </>
      );
      break;
    case "activation":
      title = L(strategy.activation.title);
      idea = L(strategy.activation.idea);
      body = (
        <>
          <h4 className={s.subhead}>{p.howItRuns}</h4>
          {list(strategy.activation.points)}
          <h4 className={s.subhead}>{p.offers}</h4>
          {list(strategy.activation.offers)}
        </>
      );
      break;
    case "budget":
      title = `${range} ${p.perMonth}`;
      idea = L(strategy.budget.note);
      body = (
        <>
          <h4 className={s.subhead}>{p.split}</h4>
          <div className={s.rows}>
            {strategy.budget.split.map((x, i) => (
              <div key={i} className={s.splitRow}>
                <span className={s.splitName}>{L(x.channel)}</span>
                <span className={s.splitTrack}>
                  <span style={{ width: `${x.percent}%`, background: SPLIT_COLORS[i % SPLIT_COLORS.length] }} />
                </span>
                <span className={s.splitPct}>{x.percent}%</span>
              </div>
            ))}
          </div>
        </>
      );
      break;
    default:
      title = L(strategy.marketing.title);
      idea = L(strategy.marketing.idea);
      body = list(strategy.marketing.points);
  }

  return (
    <article className={s.spot} aria-live="polite">
      <div className={s.spotMain}>
        <span className={s.spotDept}>{p.depts[dept]}</span>
        <h2 className={s.spotTitle}>{title}</h2>
        <p className={s.spotIdea}>{idea}</p>
        {body}
      </div>
    </article>
  );
}
