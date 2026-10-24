"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PrimaryButton } from "@/components/Buttons";
import Chip from "@/components/Chip";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { AlertIcon, ArrowIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { Canvas } from "@/components/Stage";
import { mmss } from "@/components/Timer";
import { DOMAIN_CHIPS, emailProblem, isValidEmail, suggestDomain, withDomain } from "@/lib/email";
import type { Dict, Lang } from "@/lib/i18n";
import { useElapsed } from "@/lib/useElapsed";
import s from "./Email.module.css";

/** Show the invalid state this long after typing stops (or at once on blur). */
const HINT_DELAY_MS = 1200;

export interface EmailValues {
  email: string;
  name: string;
  consent: boolean;
}

interface EmailProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onStartOver: () => void;
  initial: EmailValues;
  /** Send pressed, waiting for the server. */
  sending: boolean;
  /** The server rejected the address. */
  rejected: boolean;
  speaking: boolean;
  level: number;
  onSubmit: (values: EmailValues) => void;
  /** Visitor edited the address after a rejection. */
  onEdit: () => void;
  onPrivacy: () => void;
}

export default function Email({ t, lang, onLang, onStartOver, initial, sending, rejected, speaking, level, onSubmit, onEdit, onPrivacy }: EmailProps) {
  const [email, setEmail] = useState(initial.email);
  const [name, setName] = useState(initial.name);
  const [consent, setConsent] = useState(initial.consent);
  const [hint, setHint] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sendingMs = useElapsed(sending);

  // Keyboard up right away (the tap on "Email me the full plan" is the user gesture).
  useEffect(() => input.current?.focus({ preventScroll: true }), []);

  // Inline hint once the visitor pauses on an address that can't work.
  useEffect(() => {
    if (!email.includes("@")) return;
    const timer = setTimeout(() => setHint(true), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [email]);

  const valid = isValidEmail(email);
  const problem = rejected ? "domain" : hint ? emailProblem(email) : null;
  const suggestion = problem === "domain" ? suggestDomain(email) : null;

  const change = (value: string) => {
    setEmail(value);
    setHint(false);
    if (rejected) onEdit();
  };
  const pick = (domain: string) => {
    change(withDomain(email, domain));
    input.current?.focus({ preventScroll: true });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || sending) return;
    input.current?.blur();
    onSubmit({ email: email.trim(), name: name.trim(), consent });
  };

  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} startOverLabel={t.common.startOver} onStartOver={onStartOver} />

      <div className={s.body}>
        <div className={s.left}>
          <Orb state="speak" size={150} level={speaking ? level : undefined} />
          <div className={`grad ${s.almost}`}>
            {t.email.almostDone}
            <GreetingDots />
          </div>
          <h1 className={s.title}>{t.email.whereSend}</h1>
        </div>

        <form className={s.form} onSubmit={submit} noValidate>
          <div className={s.field}>
            <label htmlFor="i-email">{t.email.email}</label>
            <input
              ref={input}
              id="i-email"
              className={`${s.inp} ${s.email} ${problem ? s.bad : ""}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              dir="ltr"
              value={email}
              onChange={(e) => change(e.target.value)}
              onBlur={() => email.trim() && setHint(true)}
              aria-invalid={!!problem}
              aria-describedby={problem ? "i-email-msg" : undefined}
            />
            {problem && (
              <p id="i-email-msg" className={s.msg} role="alert">
                <AlertIcon />
                {problem === "domain" ? t.email.checkDomain : t.email.missingAt}
              </p>
            )}
            <div className={s.chips}>
              {suggestion && (
                <Chip className={s.chip} onClick={() => pick(suggestion)}>
                  <bdi>{t.email.suggest(suggestion)}</bdi>
                </Chip>
              )}
              {DOMAIN_CHIPS.filter((d) => d !== suggestion).map((d) => (
                <Chip key={d} className={s.chip} onClick={() => pick(d)}>
                  <bdi>@{d}</bdi>
                </Chip>
              ))}
            </div>
          </div>

          <div className={s.field}>
            <label htmlFor="i-name">
              {t.email.name} <em>{t.email.optional}</em>
            </label>
            <input
              id="i-name"
              className={s.inp}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="send"
              dir="auto"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <label className={s.consent}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t.email.consent}
          </label>

          <PrimaryButton type="submit" className={s.send} disabled={!valid || !!problem} aria-busy={sending}>
            {sending ? (
              <>
                <span className={`spin ${s.spinner}`} aria-hidden="true" />
                {t.email.sending}
                <span className={s.sendTimer} role="timer" aria-label={t.common.elapsed}>
                  {mmss(sendingMs)}
                </span>
              </>
            ) : (
              <>
                {t.email.send}
                <ArrowIcon className={s.arrow} />
              </>
            )}
          </PrimaryButton>
          <p className={`muted ${s.note}`}>
            {t.email.neverShare} ·{" "}
            <button type="button" className={s.privacy} onClick={onPrivacy}>
              {t.email.privacy}
            </button>
          </p>
        </form>
      </div>

    </Canvas>
  );
}
