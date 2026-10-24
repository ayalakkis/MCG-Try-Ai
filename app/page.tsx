"use client";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Stage from "@/components/Stage";
import SystemSheet, { type SheetState } from "@/components/SystemSheet";
import { unlockAudio } from "@/lib/audio/context";
import { config } from "@/lib/config";
import { LANGS, t as dict, type Lang } from "@/lib/i18n";
import { getServices } from "@/lib/services";
import { initialState, reducer } from "@/lib/session";
import { useConversationTurns } from "@/lib/useConversationTurns";
import { useCreateSequence } from "@/lib/useCreateSequence";
import { useEmailSend } from "@/lib/useEmailSend";
import { useHoldToTalk } from "@/lib/useHoldToTalk";
import { useCountdown, useInactivity } from "@/lib/useInactivity";
import { useSpokenLine } from "@/lib/useSpokenLine";
import Conversation from "@/screens/Conversation";
import Create from "@/screens/Create";
import Email from "@/screens/Email";
import Listening from "@/screens/Listening";
import Preview from "@/screens/Preview";
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

  const hold = useHoldToTalk({
    stt: services.stt,
    lang: state.lang,
    expect: state.screen === "conversation" ? state.asking : null,
    question: state.screen === "conversation" ? state.question?.[state.lang] : undefined,
    onStart: () => {
      services.tts.stop(); // the visitor can talk over the AI voice
      dispatch({ type: "HOLD_START", id: crypto.randomUUID() });
    },
    onSend: (transcript) => dispatch({ type: "LISTEN_SEND", transcript }),
    onCancel: () => dispatch({ type: "LISTEN_CANCEL" }),
    onError: (error) => dispatch({ type: "ERROR", state: error }),
  });
  const { abort } = hold;
  const turns = useConversationTurns(state, dispatch, services);
  const creating = useCreateSequence(state, dispatch, services);
  useEmailSend(state, dispatch, services);

  // PREVIEW stays silent so the visitor reads at their own pace; on EMAIL the AI asks where to send it,
  // in the screen language.
  const ask = useSpokenLine(services.tts, state.screen === "email" ? t.email.spoken : null, `email:${state.sessionId}`, state.lang);

  const reset = useCallback(() => {
    abort();
    services.tts.stop();
    setPrivacyOpen(false);
    dispatch({ type: "RESET" });
  }, [abort, services.tts]);

  // Inactivity: 60 s (90 s on Email) → "Still there?" → reset. Voice and AI work count as activity.
  const idleScreens = state.screen === "listening" || state.screen === "conversation" || state.screen === "preview" || state.screen === "email";
  const inactivity = useInactivity({
    enabled: idleScreens,
    timeout: state.screen === "email" ? config.timers.inactivityEmail : config.timers.inactivity,
    // Only taps reset the clock; it keeps counting while the AI thinks/speaks and while typing.
    // Holding the mic button counts as a touch for as long as the finger is down.
    busy: hold.state.holding,
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
    sheet === "mic" ? t.errors.micBody
    : sheet === "missed" ? t.errors.missedBody
    : sheet === "idle" ? t.errors.idleTitle
    : sheet === "reconnecting" && state.retryNonce === 0 ? t.errors.netBody
    : null;
  useSpokenLine(services.tts, sheetLine, `sheet:${sheet}:${state.sessionId}`, state.lang);

  const setLang = useCallback((lang: Lang) => dispatch({ type: "SET_LANG", lang }), []);

  // Dev only: lets the Playwright walkthrough open sheets without a real mic or network failure.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __mcg?: unknown }).__mcg = { dispatch };
  }, []);

  const common = { t, lang: state.lang, onLang: setLang, onStartOver: reset };

  let screen: React.ReactNode;
  switch (state.screen) {
    case "welcome":
      screen = (
        <Welcome
          t={t}
          lang={state.lang}
          onLang={setLang}
          holdProps={hold.buttonProps}
        />
      );
      break;
    case "listening":
      screen = (
        <Listening
          {...common}
          hold={hold.state}
          releaseRef={hold.releaseEl}
          onRelease={() => void hold.release()}
          onCancel={hold.cancel}
        />
      );
      break;
    case "conversation":
      screen = (
        <Conversation
          {...common}
          brief={state.brief}
          asking={state.asking}
          question={state.question}
          quickAnswers={state.quickAnswers}
          lastAnswer={state.lastAnswer}
          phase={turns.phase}
          level={turns.level}
          holdProps={hold.buttonProps}
          onQuickAnswer={(answer) => dispatch({ type: "QUICK_ANSWER", answer })}
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
          holdProps={hold.buttonProps}
          countdown={inactivity.warnLeft}
          onStillHere={inactivity.stillHere}
        />
      )}
    </Stage>
  );
}
