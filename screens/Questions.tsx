"use client";
import { useEffect, useRef, useState } from "react";
import BriefChecklist, { type BriefRow } from "@/components/BriefChecklist";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import Header from "@/components/Header";
import { ArrowIcon } from "@/components/icons";
import OptionIcon from "@/components/OptionIcon";
import Orb from "@/components/Orb";
import SectionLabel from "@/components/SectionLabel";
import { Canvas } from "@/components/Stage";
import type { Dict, Lang } from "@/lib/i18n";
import { QUESTIONS, type QuestionOption } from "@/lib/questions";
import type { Brief, BriefField, Localized } from "@/lib/services/types";
import s from "./Questions.module.css";

/** How long the tapped card shows as selected before the next question slides in. */
const ADVANCE_MS = 350;

interface QuestionsProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  brief: Brief;
  /** Index into QUESTIONS; QUESTIONS.length = the optional business-name step. */
  step: number;
  onAnswer: (field: BriefField, value: Localized, optionId: string) => void;
  onBack: () => void;
  onDone: (brandName: string) => void;
}

/**
 * design/screens/02-questions.html: one question at a time, answered by tapping a card
 * (tap → selected for a moment → next question). "Other" opens a short text field.
 * After the five questions comes the optional business name, then CREATE.
 */
export default function Questions({ t, lang, onLang, onStartOver, brief, step, onAnswer, onBack, onDone }: QuestionsProps) {
  const q = t.questions;
  const question = QUESTIONS[step];
  const [picked, setPicked] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [brand, setBrand] = useState(brief.brandName ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // The parent remounts this screen per step (key), so each question starts clean.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (typing || !question) input.current?.focus();
  }, [typing, question]);

  const pick = (opt: QuestionOption) => {
    if (picked || !question) return;
    if (opt.id === "other") {
      setTyping(true);
      return;
    }
    setPicked(opt.id);
    timer.current = setTimeout(() => onAnswer(question.field, opt.label, opt.id), ADVANCE_MS);
  };

  const submitOther = () => {
    const v = text.trim();
    if (!v || !question) return;
    onAnswer(question.field, { en: v, ar: v }, "other");
  };

  const rows: BriefRow[] = QUESTIONS.map((x, i) => ({
    key: x.field,
    label: x.short[lang],
    value: brief[x.field]?.[lang],
    status: i < step ? "done" : i === step ? "current" : "pending",
  }));
  const current = brief[question?.field ?? "business"];

  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <div className={s.main}>
          <div className={s.intro}>
            <Orb state="idle" size={64} />
            <SectionLabel style={{ fontSize: 15 }}>{question ? q.counter(step + 1, QUESTIONS.length) : q.lastStep}</SectionLabel>
          </div>
          <h1 className={s.title}>{question ? question.title[lang] : q.brandTitle}</h1>

          {question && !typing && (
            <div className={s.grid}>
              {question.options.map((opt) => {
                const on = picked === opt.id || (!picked && current?.en === opt.label.en);
                return (
                  <button key={opt.id} type="button" className={on ? `${s.opt} ${s.on}` : s.opt} aria-pressed={on} onClick={() => pick(opt)}>
                    <span className={s.oi}>
                      <OptionIcon name={opt.icon} />
                    </span>
                    {opt.label[lang]}
                  </button>
                );
              })}
            </div>
          )}

          {question && typing && (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                submitOther();
              }}
            >
              <input
                ref={input}
                className={s.inp}
                dir="auto"
                maxLength={60}
                enterKeyHint="next"
                placeholder={q.otherPlaceholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className={s.formActions}>
                <PrimaryButton type="submit" className={s.cta} disabled={!text.trim()}>
                  {q.next}
                  <ArrowIcon className={s.flip} />
                </PrimaryButton>
                <SecondaryButton className={s.cta} onClick={() => setTyping(false)}>
                  {q.showOptions}
                </SecondaryButton>
              </div>
            </form>
          )}

          {!question && (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                onDone(brand);
              }}
            >
              <input
                ref={input}
                className={s.inp}
                dir="auto"
                maxLength={32}
                autoCapitalize="words"
                enterKeyHint="go"
                placeholder={q.brandPlaceholder}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
              <div className={s.formActions}>
                <PrimaryButton type="submit" className={s.cta}>
                  {q.create}
                  <ArrowIcon className={s.flip} />
                </PrimaryButton>
                <SecondaryButton className={s.cta} onClick={() => onDone("")}>
                  {q.skip}
                </SecondaryButton>
              </div>
            </form>
          )}
        </div>

        <aside className={s.side}>
          <BriefChecklist
            title={q.yourBrief}
            rows={rows}
            nowLabel={q.nowLabel}
            between={
              <div className={s.bars} aria-hidden="true">
                {QUESTIONS.map((x, i) => (
                  <i key={x.field} className={i <= step ? s.barOn : undefined} />
                ))}
              </div>
            }
          />
          <p className={s.hint}>{question ? q.hint : q.brandHint}</p>
          <SecondaryButton className={s.back} onClick={onBack}>
            <ArrowIcon className={s.backIcon} />
            {q.back}
          </SecondaryButton>
        </aside>
      </div>
    </Canvas>
  );
}
