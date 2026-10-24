"use client";
/**
 * CREATE (HANDOFF.md §6): 4 stages tick off with a progress bar paced on the strategy's usual
 * time. The request starts as soon as the brief is complete (while the AI still says its closing
 * line on CONVERSATION), and PREVIEW opens as soon as it arrives, after a short minimum so the
 * stages can be read. If the API is slower, the bar holds at 96% until it arrives. A failed
 * request shows "Reconnecting" on CREATE and is retried without restarting the visible sequence.
 */
import { useEffect, useState, type Dispatch } from "react";
import type { Services } from "./services/interfaces";
import type { Strategy } from "./services/types";
import type { Action, SessionState } from "./session";

/** Typical strategy time (3 Gemini calls, ~17 s): paces the bar and the stages. */
export const CREATE_DURATION_MS = 18_000;
/** Shortest time on CREATE, so a fast (or early) strategy doesn't flash the screen. */
const MIN_ON_SCREEN_MS = 6_000;
/** After the strategy lands: the bar runs to 100% and the last stage ticks before PREVIEW. */
const FINISH_MS = 700;
export const CREATE_STAGES = 4;
const HOLD_AT = 0.96;
const TICK_MS = 200;

export interface CreateProgress {
  /** 0–1, drives the bar. */
  progress: number;
  /** Index of the active stage (0–3); stages before it are done. */
  stage: number;
  /** Strategy as soon as it arrives (its keywords can feed the floating chips). */
  strategy: Strategy | null;
  /** Real ms since CREATE opened (the on-screen timer). */
  elapsed: number;
}

type Result = { run: string; strategy: Strategy | null; failed: boolean; at: number };

export function useCreateSequence(state: SessionState, dispatch: Dispatch<Action>, services: Services): CreateProgress {
  const onCreate = state.screen === "create";
  /** One run per visitor and brief; values from an earlier run read as fresh (0 / null). */
  const run = `${state.sessionId}:${state.turnId}`;
  /** Ask early: the brief is final once the AI's closing turn arrives. */
  const requesting = onCreate || (state.screen === "conversation" && state.briefDone && !state.awaiting);
  const [tick, setTick] = useState({ run: "", started: 0, now: 0 });
  const [result, setResult] = useState<Result>({ run: "", strategy: null, failed: false, at: 0 });
  const live = onCreate && tick.run === run;
  const elapsed = live ? tick.now - tick.started : 0;
  const mine = result.run === run;
  const strategy = onCreate && mine ? result.strategy : null;
  const failed = onCreate && mine && result.failed;

  // The visible sequence: runs once per visit to CREATE.
  useEffect(() => {
    if (!onCreate) return;
    const started = performance.now();
    const timer = setInterval(() => setTick({ run, started, now: performance.now() }), TICK_MS);
    return () => clearInterval(timer);
  }, [onCreate, run]);

  // The request: starts with the closing turn (or CREATE), runs again on "Retry now" / auto-retry.
  // A new `run` (turnId) restarts it if the visitor kept talking after the closing turn.
  useEffect(() => {
    if (!requesting) return;
    let alive = true;
    services.strategy
      .generate(state.brief, state.lang, state.id)
      .then((s) => {
        if (alive) setResult({ run, strategy: s, failed: false, at: performance.now() });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        console.warn("[strategy]", e);
        setResult({ run, strategy: null, failed: true, at: 0 });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requesting, run, state.retryNonce]);

  // A failure shows "Reconnecting" only once the visitor is on CREATE (again after each failed retry).
  useEffect(() => {
    if (failed) dispatch({ type: "ERROR", state: "reconnecting", retry: "strategy" });
  }, [failed, result, dispatch]);

  const finishedAt = strategy && live ? Math.max(MIN_ON_SCREEN_MS, result.at - tick.started + FINISH_MS) : Infinity;
  const done = elapsed >= finishedAt;
  useEffect(() => {
    if (onCreate && done && strategy) dispatch({ type: "STRATEGY_READY", strategy });
  }, [onCreate, done, strategy, dispatch]);

  const raw = Math.min(HOLD_AT, elapsed / CREATE_DURATION_MS);
  // Once the strategy is in, the bar runs from where it is to 100% by `finishedAt`.
  const progress = strategy && live && Number.isFinite(finishedAt) ? Math.max(raw, Math.min(1, elapsed / finishedAt)) : raw;
  const stage = Math.min(CREATE_STAGES - 1, Math.floor(progress * CREATE_STAGES));
  return { progress, stage, strategy, elapsed };
}
