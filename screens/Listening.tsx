"use client";
import type { RefObject } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import Header from "@/components/Header";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import Timer, { mmss } from "@/components/Timer";
import Waveform, { type WaveBar } from "@/components/Waveform";
import type { Dict, Lang } from "@/lib/i18n";
import { useElapsed } from "@/lib/useElapsed";
import type { HoldState } from "@/lib/useHoldToTalk";
import s from "./Listening.module.css";

/** Bar heights and stand-in delays copied from the design. */
const BARS: WaveBar[] = [
  { h: 16, delay: -0.1 }, { h: 30, delay: -0.5 }, { h: 42, delay: -0.2 }, { h: 24, delay: -0.7 },
  { h: 46, delay: -0.3 }, { h: 34, delay: -0.9 }, { h: 48, delay: -0.4 }, { h: 28, delay: -0.6 },
  { h: 40, delay: -0.15 }, { h: 20, delay: -0.8 }, { h: 36, delay: -0.35 }, { h: 18, delay: -0.25 },
];
const BUTTON_BARS: WaveBar[] = [{ h: 12 }, { h: 24, delay: -0.4 }, { h: 18, delay: -0.7 }, { h: 26, delay: -0.2 }];

interface ListeningProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  hold: HoldState;
  releaseRef: RefObject<HTMLElement | null>;
  onRelease: () => void;
  onCancel: () => void;
}

export default function Listening({ t, lang, onLang, onStartOver, hold, releaseRef, onRelease, onCancel }: ListeningProps) {
  // Button bars follow the newest 4 samples.
  const transcribingMs = useElapsed(hold.transcribing);
  const buttonLevels = hold.holding ? hold.levels.slice(-BUTTON_BARS.length) : undefined;

  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <div className={s.left}>
          {/* After release the recording is transcribed: the orb thinks until the answer lands. */}
          <Orb state={hold.transcribing ? "think" : "listen"} size={340} level={hold.holding ? hold.level : undefined} />
          {hold.transcribing ? (
            <div className={s.status}>
              <Timer ms={transcribingMs} label={t.common.elapsed} />
            </div>
          ) : (
            <div className={s.status} role="status">
              <span className={s.dot} aria-hidden="true" />
              {t.listening.listening}
              <span className={s.timer}>{mmss(hold.elapsedMs)}</span>
            </div>
          )}
        </div>

        <div className={s.right}>
          <Waveform bars={BARS} barWidth={5} gap={5} height={48} levels={hold.holding ? hold.levels : undefined} />
          <p className={s.caption} aria-live="polite">
            {hold.final}
            {hold.final && hold.interim ? " " : ""}
            {hold.interim && <span className={s.interim}>{hold.interim}</span>}
            <span className={s.caret} aria-hidden="true" />
          </p>
          <div className={s.actions}>
            <SecondaryButton className={s.cancel} onClick={onCancel}>
              {t.listening.cancel}
            </SecondaryButton>
            <PrimaryButton
              ref={releaseRef as RefObject<HTMLButtonElement>}
              className={s.send}
              pressed={hold.holding}
              onClick={onRelease}
            >
              <Waveform bars={BUTTON_BARS} barWidth={4} gap={4} height={26} color="#fff" levels={buttonLevels} />
              {t.listening.releaseToSend}
            </PrimaryButton>
          </div>
        </div>
      </div>

    </Canvas>
  );
}
