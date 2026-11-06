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
import { QUESTIONS } from "@/lib/questions";
import type { Brief, BriefField, Localized } from "@/lib/services/types";
import s from "./Questions.module.css";

interface QuestionsProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  brief: Brief;
  /** Index into QUESTIONS; QUESTIONS.length = the optional business-name step. */
  step: number;
  onAnswer: (field: BriefField, value: Localized, optionIds: string[]) => void;
  onBack: () => void;
  onDone: (brandName: string) => void;
}

/**
 * design/screens/02-questions.html: one question at a time. The visitor taps one or more cards
 * and can also type something else, then Next. After the five questions comes the optional
 * business name, then CREATE. The parent remounts this screen per step, so each starts clean.
 */
export default function Questions({ t, lang, onLang, onStartOver, brief, step, onAnswer, onBack, onDone }: QuestionsProps) {
  const q = t.questions;
  const question = QUESTIONS[step];
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [brand, setBrand] = useState(brief.brandName ?? "");
  const brandInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!question) brandInput.current?.focus();
  }, [question]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const extra = text.trim();
  const ready = picked.length > 0 || extra.length > 0;

  const next = () => {
    if (!question || !ready) return;
    // Options in the order shown, then whatever was typed.
    const chosen = question.options.filter((o) => picked.includes(o.id));
    const join = (l: Lang, sep: string) => [...chosen.map((o) => o.label[l]), ...(extra ? [extra] : [])].join(sep);
    onAnswer(question.field, { en: join("en", ", "), ar: join("ar", "، ") }, chosen.map((o) => o.id));
  };

  const rows: BriefRow[] = QUESTIONS.map((x, i) => ({
    key: x.field,
    label: x.short[lang],
    value: brief[x.field]?.[lang],
    status: i < step ? "done" : i === step ? "current" : "pending",
  }));

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

          {question ? (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <div className={s.grid}>
                {question.options.map((opt) => {
                  const on = picked.includes(opt.id);
                  return (
                    <button key={opt.id} type="button" className={on ? `${s.opt} ${s.on}` : s.opt} aria-pressed={on} onClick={() => toggle(opt.id)}>
                      <span className={s.oi}>
                        <OptionIcon name={opt.icon} />
                      </span>
                      {opt.label[lang]}
                    </button>
                  );
                })}
              </div>
              <input
                className={s.inp}
                dir="auto"
                maxLength={60}
                enterKeyHint="next"
                placeholder={q.otherPlaceholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className={s.formActions}>
                <PrimaryButton type="submit" className={s.cta} disabled={!ready}>
                  {q.next}
                  <ArrowIcon className={s.flip} />
                </PrimaryButton>
              </div>
            </form>
          ) : (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                onDone(brand);
              }}
            >
              <input
                ref={brandInput}
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
