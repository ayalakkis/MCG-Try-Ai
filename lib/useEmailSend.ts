"use client";
/**
 * EMAIL → THANK YOU: sends the strategy once Send is pressed and moves on only after the send
 * succeeds. A rejected address shows the inline invalid-email state; anything else shows
 * "Reconnecting", whose retries re-send (the server dedupes with an idempotency key).
 * With consent, the lead is saved afterwards; that never blocks the visitor.
 */
import { useEffect, type Dispatch } from "react";
import { ServiceError } from "./services/errors";
import type { Services } from "./services/interfaces";
import type { Action, SessionState } from "./session";

export function useEmailSend(state: SessionState, dispatch: Dispatch<Action>, services: Services) {
  const active = state.screen === "email" && state.sending;

  useEffect(() => {
    if (!active || !state.strategy) return;
    let live = true;
    const sessionId = state.id || crypto.randomUUID();
    const { email, name, consent, lang, strategy, brief } = state;
    services.email
      .send({ email, name: name || undefined, consent, lang, strategy, brief, sessionId })
      .then(() => {
        if (!live) return;
        dispatch({ type: "EMAIL_SENT" });
        if (consent) {
          services.leads
            .save({ sessionId, email, name: name || undefined, consent, lang, brief, strategyName: strategy.headline })
            .catch((e: unknown) => console.warn("[leads]", e));
        }
      })
      .catch((e: unknown) => {
        if (!live) return;
        console.warn("[email]", e);
        if (e instanceof ServiceError && e.state === "invalid-email") dispatch({ type: "EMAIL_REJECTED" });
        else dispatch({ type: "ERROR", state: "reconnecting", retry: "email" });
      });
    return () => {
      live = false;
    };
    // Runs per submit, per retry and per visitor; the payload is read from that moment's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, state.retryNonce, state.sessionId]);
}
