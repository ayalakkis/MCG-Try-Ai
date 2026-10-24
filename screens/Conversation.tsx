"use client";
import BriefChecklist, { type BriefRow } from "@/components/BriefChecklist";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import Header from "@/components/Header";
import { MicIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import Timer from "@/components/Timer";
import type { Dict, Lang } from "@/lib/i18n";
import { BRIEF_FIELDS, type Brief, type BriefField, type Localized, type QuickAnswer } from "@/lib/services/types";
import type { TurnPhase } from "@/lib/useConversationTurns";
import { useElapsed } from "@/lib/useElapsed";
import type { HoldButtonProps } from "@/lib/useHoldToTalk";
import s from "./Conversation.module.css";

interface ConversationProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  brief: Brief;
  asking: BriefField | null;
  question: Localized | null;
  quickAnswers: QuickAnswer[];
  lastAnswer: string | null;
  phase: TurnPhase;
  /** TTS envelope 0–1 while speaking. */
  level: number;
  holdProps: HoldButtonProps;
  onQuickAnswer: (answer: string) => void;
}

export default function Conversation(p: ConversationProps) {
  const { t, lang } = p;
  const rows: BriefRow[] = BRIEF_FIELDS.map((f) => ({
    key: f,
    label: t.conversation.fields[f],
    value: p.brief[f]?.[lang],
    status: p.brief[f] ? "done" : f === p.asking ? "current" : "pending",
  }));
  const orbState = p.phase === "thinking" ? "think" : p.phase === "speaking" ? "speak" : "idle";
  const thinkingMs = useElapsed(p.phase === "thinking");

  return (
    <Canvas>
      <Header lang={lang} onLang={p.onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={p.onStartOver} />

      <div className={s.body}>
        <div className={[s.left, p.phase === "thinking" ? s.thinking : ""].join(" ")}>
          <div className={s.orbWrap}>
            <Orb state={orbState} size={220} level={p.phase === "speaking" ? p.level : undefined} />
            {p.phase === "thinking" && <Timer ms={thinkingMs} label={t.common.elapsed} className={s.timer} />}
          </div>
          {p.lastAnswer && <p className={s.quote}>{t.conversation.quote(p.lastAnswer)}</p>}
          {p.question && (
            <h1 className={s.question} aria-live="polite">
              {p.question[lang]}
            </h1>
          )}
          {p.quickAnswers.length > 0 && (
            <div className={s.answers}>
              {p.quickAnswers.map((a) => (
                <SecondaryButton
                  key={a.id}
                  className={s.answer}
                  disabled={p.phase === "thinking"}
                  onClick={() => p.onQuickAnswer(a.label[lang])}
                >
                  {a.label[lang]}
                </SecondaryButton>
              ))}
            </div>
          )}
        </div>

        <div className={s.right}>
          <BriefChecklist title={t.conversation.yourBrief} rows={rows} nowLabel={t.conversation.now} />
          <PrimaryButton className={s.hold} {...p.holdProps}>
            <MicIcon />
            {t.conversation.holdToAnswer}
          </PrimaryButton>
        </div>
      </div>

    </Canvas>
  );
}
