"use client";
/**
 * Drives CONVERSATION: sends each visitor answer to Conversation.next(), applies the brief
 * updates, then speaks the next question in the screen language while its audio envelope
 * drives the orb. Once the brief is complete and the closing line is spoken, moves to CREATE.
 */
import { useEffect, useRef, useState, type Dispatch } from "react";
import { LANGS } from "./i18n";
import type { Services } from "./services/interfaces";
import type { Action, SessionState } from "./session";

export type TurnPhase = "thinking" | "speaking" | "waiting";

export function useConversationTurns(state: SessionState, dispatch: Dispatch<Action>, services: Services) {
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const spokenTurn = useRef("");

  const onConversation = state.screen === "conversation";

  // 1. Visitor answered: ask the AI for the next turn.
  useEffect(() => {
    if (!onConversation || !state.awaiting) return;
    let live = true;
    services.conversation
      .next({ lang: state.lang, brief: state.brief, history: state.history, lastAnswer: state.lastAnswer })
      .then((turn) => {
        if (!live) return;
        dispatch({
          type: "TURN",
          brief: { ...state.brief, ...turn.briefUpdates },
          asking: turn.asking,
          question: turn.question,
          quickAnswers: turn.quickAnswers,
          done: turn.done,
        });
      })
      .catch((e: unknown) => {
        if (!live) return;
        console.warn("[conversation]", e);
        // "Reconnecting" sheet; the brief and the pending answer are kept for the retry.
        dispatch({ type: "ERROR", state: "reconnecting", retry: "conversation" });
      });
    return () => {
      live = false;
    };
    // Re-run only when a new answer arrives, on retry, or when the visitor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConversation, state.awaiting, state.sessionId, state.retryNonce]);

  // 2. New AI turn: speak it once (not again when a cancelled hold returns here), and again in
  //    the other language if the visitor switches while it is up.
  useEffect(() => {
    if (!onConversation || state.awaiting || !state.question) return;
    const key = `${state.sessionId}:${state.turnId}:${state.lang}`;
    if (spokenTurn.current === key) {
      if (state.briefDone) dispatch({ type: "BRIEF_COMPLETE" });
      return;
    }
    spokenTurn.current = key;
    let live = true;
    setSpeaking(true);
    services.tts
      .speak(state.question[state.lang], LANGS[state.lang].speechLang, (l) => {
        if (live) setLevel(l);
      })
      .catch(() => {})
      .then(() => {
        if (!live) return;
        setSpeaking(false);
        setLevel(0);
        if (state.briefDone) dispatch({ type: "BRIEF_COMPLETE" });
      });
    return () => {
      live = false;
      services.tts.stop();
      setSpeaking(false);
      setLevel(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConversation, state.awaiting, state.turnId, state.sessionId, state.lang]);

  const phase: TurnPhase = state.awaiting ? "thinking" : speaking ? "speaking" : "waiting";
  return { phase, level };
}
