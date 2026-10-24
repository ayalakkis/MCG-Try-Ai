"use client";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { CheckIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import Timer from "@/components/Timer";
import type { Dict, Lang } from "@/lib/i18n";
import type { Brief, Localized } from "@/lib/services/types";
import type { CreateProgress } from "@/lib/useCreateSequence";
import s from "./Create.module.css";

const CHIP_POS = [s.chip0, s.chip1, s.chip2, s.chip3];
/** Float offsets from the design, so the chips bob out of phase. */
const CHIP_DELAY = ["0s", "-2s", "-3.5s", "-1s"];

/** Keywords the AI pulled from the brief (or the strategy's, once it arrives); else the brief's own values. */
function chipsFor(brief: Brief, strategyKeywords?: Localized[]): Localized[] {
  if (brief.keywords?.length) return brief.keywords.slice(0, 4);
  if (strategyKeywords?.length) return strategyKeywords.slice(0, 4);
  return [brief.location, brief.audience, brief.goal, brief.business].filter((v): v is Localized => !!v);
}

interface CreateProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  brief: Brief;
  progress: CreateProgress;
}

export default function Create({ t, lang, onLang, onStartOver, brief, progress }: CreateProps) {
  const chips = chipsFor(brief, progress.strategy?.keywords);
  const pct = Math.round(progress.progress * 1000) / 10;

  return (
    <Canvas style={{ paddingBottom: 40, overflow: "hidden" }}>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <div className={s.visual}>
          <i className={s.halo} aria-hidden="true" />
          <Orb state="create" size={360} />
          {chips.map((c, i) => (
            <Chip key={i} floating className={`${s.chip} ${CHIP_POS[i]}`} style={{ animationDelay: CHIP_DELAY[i] }}>
              {c[lang]}
            </Chip>
          ))}
        </div>

        <div className={s.content}>
          <div className={`grad ${s.watch}`}>
            {t.create.watchUsCreate}
            <GreetingDots />
          </div>
          <h1 className={s.title}>{t.create.building}</h1>
          <Card className={s.stages} role="list">
            {t.create.stages.map((label, i) => {
              const status = i < progress.stage ? "done" : i === progress.stage ? "active" : "pending";
              return (
                <div key={label} className={s.st} role="listitem" aria-current={status === "active" ? "step" : undefined}>
                  {status === "done" && (
                    <span className={s.ok}>
                      <CheckIcon />
                    </span>
                  )}
                  {status === "active" && <span className={`spin ${s.spinner}`} />}
                  {status === "pending" && <span className={s.empty} />}
                  <span className={status === "done" ? s.doneText : status === "active" ? s.shim : s.pendingText}>{label}</span>
                </div>
              );
            })}
          </Card>
          <span
            className={s.bar}
            role="progressbar"
            aria-label={t.create.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <span className={s.fill} style={{ width: `${pct}%` }} />
          </span>
          <Timer ms={progress.elapsed} label={t.common.elapsed} className={s.timer} />
        </div>
      </div>
    </Canvas>
  );
}
