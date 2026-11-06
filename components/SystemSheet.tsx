"use client";
import type { ReactNode } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { MailIcon, WifiOffIcon } from "./icons";
import SectionLabel from "./SectionLabel";
import s from "./SystemSheet.module.css";

/** API error states (invalid-email is inline on screen 06) plus the two UI-only sheets. */
export type SheetState = "reconnecting" | "send-failed" | "idle" | "privacy";

interface SystemSheetProps {
  state: SheetState;
  t: Dict;
  lang: Lang;
  onStartOver: () => void;
  /** reconnecting: "Retry now". */
  onRetry?: () => void;
  /** send-failed: "Back"; privacy: "Close". */
  onDismiss?: () => void;
  /** idle: seconds left before the reset, and "I'm here". */
  countdown?: number;
  onStillHere?: () => void;
}

/**
 * System states from design/reference/orb-states-and-errors.html, shown as a centered sheet
 * over the dimmed screen. The AI reads the body out loud in the screen language.
 */
export default function SystemSheet(p: SystemSheetProps) {
  const { state, t } = p;
  const e = t.errors;

  let label: string;
  let icon: ReactNode;
  let title: string;
  let body: string;
  let extra: ReactNode = null;
  let actions: ReactNode;

  switch (state) {
    case "idle": {
      const n = p.countdown ?? 0;
      const pct = `${(n / 10) * 100}%`;
      label = e.idleLabel;
      icon = (
        <span className={s.countdown}>
          <span className={s.cd} style={{ background: `conic-gradient(#144074 0 ${pct}, #DFE9F3 ${pct} 100%)` }} />
          <span className={s.num}>{n}</span>
        </span>
      );
      title = e.idleTitle;
      body = e.idleBody(n);
      actions = (
        <>
          <PrimaryButton className={s.btn} onClick={p.onStillHere}>
            {e.imHere}
          </PrimaryButton>
          <SecondaryButton className={s.btn} onClick={p.onStartOver}>
            {t.common.startOver}
          </SecondaryButton>
        </>
      );
      break;
    }
    case "send-failed":
      label = e.sendLabel;
      icon = (
        <span className={`${s.ic} ${s.warm}`}>
          <MailIcon />
        </span>
      );
      title = e.sendTitle;
      body = e.sendBody;
      actions = (
        <>
          <PrimaryButton className={s.btn} onClick={p.onDismiss}>
            {e.back}
          </PrimaryButton>
          <SecondaryButton className={s.btn} onClick={p.onStartOver}>
            {t.common.startOver}
          </SecondaryButton>
        </>
      );
      break;
    case "privacy":
      label = t.email.privacy;
      icon = null;
      title = t.email.privacyTitle;
      body = t.email.privacyBody;
      actions = (
        <PrimaryButton className={s.btn} onClick={p.onDismiss}>
          {t.email.close}
        </PrimaryButton>
      );
      break;
    default:
      label = e.netLabel;
      icon = (
        <span className={s.ic}>
          <WifiOffIcon />
        </span>
      );
      title = e.netTitle;
      body = e.netBody;
      extra = (
        <div className={s.retrying}>
          <span className={`spin ${s.spinner}`} />
          {e.retrying}
        </div>
      );
      actions = (
        <>
          <PrimaryButton className={s.btn} onClick={p.onRetry}>
            {e.retryNow}
          </PrimaryButton>
          <SecondaryButton className={s.btn} onClick={p.onStartOver}>
            {t.common.startOver}
          </SecondaryButton>
        </>
      );
  }

  return (
    <div className={s.overlay} role="alertdialog" aria-modal="true" aria-labelledby="sheet-title">
      <div className={s.sheet}>
        <SectionLabel style={{ fontSize: 20 }}>{label}</SectionLabel>
        {icon}
        <h3 id="sheet-title" className={s.title}>
          {title}
        </h3>
        <p className={s.body}>{body}</p>
        {extra}
        <div className={s.actions}>{actions}</div>
      </div>
    </div>
  );
}
