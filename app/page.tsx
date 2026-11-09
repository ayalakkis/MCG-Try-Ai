"use client";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Stage from "@/components/Stage";
import SystemSheet, { type SheetState } from "@/components/SystemSheet";
import { unlockAudio } from "@/lib/audio/context";
import { config } from "@/lib/config";
import { newId } from "@/lib/id";
import { LANGS, t as dict, type Lang } from "@/lib/i18n";
import { getServices } from "@/lib/services";
import { initialState, reducer } from "@/lib/session";
import { useCreateSequence } from "@/lib/useCreateSequence";
import { useEmailSend } from "@/lib/useEmailSend";
import { useCountdown, useInactivity } from "@/lib/useInactivity";
import { useSpokenLine } from "@/lib/useSpokenLine";
import Create from "@/screens/Create";
import Email from "@/screens/Email";
import Preview from "@/screens/Preview";
import Questions from "@/screens/Questions";
import Thanks from "@/screens/Thanks";
import Welcome from "@/screens/Welcome";

/** Auto-retry delay while the "Reconnecting" sheet is up. */
const AUTO_RETRY_MS = 8_000;

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const t = useMemo(() => dict(state.lang), [state.lang]);
  const { dir, htmlLang } = LANGS[state.lang];
  const services = getServices();

  useEffect(() => {
    document.documentElement.lang = htmlLang;
    document.documentElement.dir = dir;
  }, [dir, htmlLang]);

  // iPad Safari plays audio only after a gesture: unlock Web Audio on the first touches.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, { capture: true });
    return () => window.removeEventListener("pointerdown", unlockAudio, { capture: true });
  }, []);

  const creating = useCreateSequence(state, dispatch, services);
  useEmailSend(state, dispatch, services);

  // PREVIEW stays silent so the visitor reads at their own pace; on EMAIL the AI asks where to send it,
  // in the screen language.
  const ask = useSpokenLine(services.tts, state.screen === "email" ? t.email.spoken : null, `email:${state.sessionId}`, state.lang);

  const reset = useCallback(() => {
    services.tts.stop();
    setPrivacyOpen(false);
    dispatch({ type: "RESET" });
  }, [services.tts]);

  // Inactivity: 60 s (90 s on Email) → "Still there?" → reset.
  const idleScreens = state.screen === "questions" || state.screen === "preview" || state.screen === "email";
  const inactivity = useInactivity({
    enabled: idleScreens,
    timeout: state.screen === "email" ? config.timers.inactivityEmail : config.timers.inactivity,
    // Only taps reset the clock; it keeps counting while the AI thinks/speaks and while typing.
    busy: false,
    resetKey: `${state.sessionId}:${state.screen}`,
    onTimeout: reset,
  });
  const thanksLeft = useCountdown(config.timers.thanks, state.screen === "thanks", `thanks:${state.sessionId}`, reset);

  // "Reconnecting…": retry by itself every few seconds; "Retry now" and "Start over" stay available.
  const reconnecting = state.error?.state === "reconnecting";
  useEffect(() => {
    if (!reconnecting) return;
    const timer = setTimeout(() => dispatch({ type: "RETRY" }), AUTO_RETRY_MS);
    return () => clearTimeout(timer);
  }, [reconnecting, state.retryNonce]);

  // Which sheet is up: "Still there?" wins over errors, errors over the privacy note.
  const sheet: SheetState | null = inactivity.warning
    ? "idle"
    : state.error && state.error.state !== "invalid-email"
      ? state.error.state
      : privacyOpen
        ? "privacy"
        : null;

  // The AI says each sheet's line out loud in the screen language ("Reconnecting" only before its first auto-retry).
  const sheetLine =
    sheet === "idle" ? t.errors.idleTitle
    : sheet === "reconnecting" && state.retryNonce === 0 ? t.errors.netBody
    : sheet === "send-failed" ? t.errors.sendBody
    : null;
  useSpokenLine(services.tts, sheetLine, `sheet:${sheet}:${state.sessionId}`, state.lang);

  const setLang = useCallback((lang: Lang) => dispatch({ type: "SET_LANG", lang }), []);

  // Dev only: lets the Playwright walkthrough open sheets without a real network failure.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __mcg?: unknown }).__mcg = { dispatch };
  }, []);

  const common = { t, lang: state.lang, onLang: setLang, onStartOver: reset };

  let screen: React.ReactNode;
  switch (state.screen) {
    case "welcome":
      screen = <Welcome t={t} lang={state.lang} onLang={setLang} onStart={() => dispatch({ type: "START", id: newId() })} />;
      break;
    case "questions":
      screen = (
        <Questions
          key={`${state.sessionId}:${state.step}`}
          {...common}
          brief={state.brief}
          step={state.step}
          onAnswer={(field, value, optionIds) => dispatch({ type: "ANSWER", field, value, optionIds })}
          onBack={() => dispatch({ type: "BACK" })}
          onDone={(brandName) => dispatch({ type: "QUESTIONS_DONE", brandName })}
        />
      );
      break;
    case "create":
      screen = <Create t={t} lang={state.lang} onLang={setLang} onStartOver={reset} brief={state.brief} progress={creating} />;
      break;
    case "preview":
      screen = state.strategy && (
        <Preview
          {...common}
          strategy={state.strategy}
          brief={state.brief}
          onEmail={() => dispatch({ type: "EMAIL_REQUEST" })}
          onNotNow={reset}
        />
      );
      break;
    case "email":
      screen = (
        <Email
          key={state.sessionId}
          {...common}
          initial={{ email: state.email, name: state.name, consent: state.consent }}
          sending={state.sending}
          rejected={state.emailRejected}
          speaking={ask.speaking}
          level={ask.level}
          onSubmit={(v) => dispatch({ type: "EMAIL_SUBMIT", ...v })}
          onEdit={() => dispatch({ type: "EMAIL_EDIT" })}
          onPrivacy={() => setPrivacyOpen(true)}
        />
      );
      break;
    case "thanks":
      screen = (
        <Thanks t={t} lang={state.lang} onLang={setLang} name={state.name} email={state.email} secondsLeft={thanksLeft} onStartOver={reset} />
      );
      break;
  }

  return (
    <Stage dir={dir} lang={htmlLang}>
      {screen}
      {sheet && (
        <SystemSheet
          state={sheet}
          t={t}
          lang={state.lang}
          onStartOver={reset}
          onRetry={() => dispatch({ type: "RETRY" })}
          onDismiss={() => (sheet === "privacy" ? setPrivacyOpen(false) : dispatch({ type: "DISMISS_ERROR" }))}
          countdown={inactivity.warnLeft}
          onStillHere={inactivity.stillHere}
        />
      )}
    </Stage>
  );
}
