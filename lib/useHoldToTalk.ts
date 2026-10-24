"use client";
/**
 * Hold-to-talk (HANDOFF.md §5–6): finger down = start listening, release = send,
 * finger slides off the button = cancel. The press starts on Welcome / Conversation and
 * the screen switches to LISTENING underneath the finger, so the pointer is tracked on
 * `window` rather than on the (now unmounted) button.
 *
 * After release the recording is transcribed (`transcribing`); a very short hold counts as an
 * accidental tap, an empty transcript shows "Didn't catch that", a missing mic "Can't hear you".
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { config } from "./config";
import type { Lang } from "./i18n";
import type { ErrorState } from "./schemas";
import { ServiceError } from "./services/errors";
import type { SpeechToText } from "./services/interfaces";
import type { BriefField } from "./services/types";

/** Bars in the listening waveform; each shows one recent level sample. */
export const LEVEL_HISTORY = 12;
/** How far (CSS px, unscaled client px) the finger may drift outside a button before it counts as "off". */
const SLOP = 24;
/** Safety cap: auto-send after this long. */
const MAX_HOLD_MS = 60_000;

interface Options {
  stt: SpeechToText;
  lang: Lang;
  /** Brief field currently being asked (hint for the recogniser). */
  expect?: BriefField | null;
  /** Question on screen (context for the transcriber). */
  question?: string;
  onStart: () => void;
  onSend: (transcript: string) => void;
  onCancel: () => void;
  /** "mic" (denied/unavailable), "missed" (nothing intelligible) or "reconnecting" (upload failed). */
  onError: (state: ErrorState) => void;
}

export interface HoldState {
  holding: boolean;
  /** Released; the recording is being transcribed. */
  transcribing: boolean;
  final: string;
  interim: string;
  level: number;
  levels: number[];
  elapsedMs: number;
}

export interface HoldButtonProps {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onContextMenu: (e: { preventDefault(): void }) => void;
}

const IDLE: HoldState = { holding: false, transcribing: false, final: "", interim: "", level: 0, levels: Array(LEVEL_HISTORY).fill(0), elapsedMs: 0 };

const inside = (r: DOMRect, x: number, y: number) =>
  x >= r.left - SLOP && x <= r.right + SLOP && y >= r.top - SLOP && y <= r.bottom + SLOP;

export function useHoldToTalk({ stt, lang, expect = null, question, onStart, onSend, onCancel, onError }: Options) {
  const [state, setState] = useState<HoldState>(IDLE);

  // Latest callbacks without re-binding listeners.
  const cb = useRef({ onStart, onSend, onCancel, onError, lang, expect, question });
  useEffect(() => {
    cb.current = { onStart, onSend, onCancel, onError, lang, expect, question };
  });

  const active = useRef<null | { pointerId: number | null; key: string | null; origin: DOMRect | null; startedAt: number }>(null);
  /** Bumped on cancel/abort so a late transcript from an earlier hold is dropped. */
  const generation = useRef(0);
  const transcribing = useRef(false);
  /** The "Release to send" button on LISTENING also counts as "on the button". */
  const releaseEl = useRef<HTMLElement | null>(null);
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; cap?: ReturnType<typeof setTimeout> }>({});
  const levels = useRef<number[]>(IDLE.levels);

  const detach = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    detach.current();
    detach.current = () => {};
    clearInterval(timers.current.tick);
    clearTimeout(timers.current.cap);
    timers.current = {};
    active.current = null;
    levels.current = IDLE.levels;
  }, []);

  /** Finish the hold and send what was heard. */
  const release = useCallback(async () => {
    const a = active.current;
    if (!a) return;
    const heldMs = performance.now() - a.startedAt;
    cleanup();
    const gen = generation.current;
    if (heldMs < config.voice.minHoldMs) {
      stt.cancel();
      setState(IDLE);
      cb.current.onCancel();
      return;
    }
    transcribing.current = true;
    setState((s) => ({ ...s, holding: false, transcribing: true, level: 0, levels: IDLE.levels }));
    let transcript = "";
    let error: ErrorState | null = null;
    try {
      transcript = (await stt.stop()).trim();
      if (!transcript) error = "missed";
    } catch (e) {
      error = e instanceof ServiceError && e.state !== "invalid-email" ? e.state : "reconnecting";
    }
    transcribing.current = false;
    if (gen !== generation.current) return; // Start over / timeout happened meanwhile
    setState(IDLE);
    if (error) {
      cb.current.onCancel();
      cb.current.onError(error);
    } else cb.current.onSend(transcript);
  }, [cleanup, stt]);

  /** Abort without sending and return to where the hold started. */
  const cancel = useCallback(() => {
    if (!active.current) return;
    generation.current++;
    cleanup();
    stt.cancel();
    setState(IDLE);
    cb.current.onCancel();
  }, [cleanup, stt]);

  /** Abort silently (Start over / inactivity reset handles navigation itself). */
  const abort = useCallback(() => {
    generation.current++;
    transcribing.current = false;
    if (active.current) {
      cleanup();
      stt.cancel();
    }
    setState(IDLE);
  }, [cleanup, stt]);

  const begin = useCallback(
    (pointerId: number | null, key: string | null, origin: DOMRect | null, el: HTMLElement | null = null) => {
      if (active.current || transcribing.current) return;
      active.current = { pointerId, key, origin, startedAt: performance.now() };
      const gen = generation.current;
      setState({ ...IDLE, holding: true });
      cb.current.onStart();

      const moved = (x: number, y: number) => {
        const a = active.current;
        if (!a) return;
        const rel = releaseEl.current?.getBoundingClientRect();
        const onButton = (a.origin && inside(a.origin, x, y)) || (rel && inside(rel, x, y));
        if (!onButton) cancel();
      };
      const onMove = (e: globalThis.PointerEvent) => {
        if (active.current && e.pointerId === active.current.pointerId) moved(e.clientX, e.clientY);
      };
      // Touch fallback. The pressed button is unmounted when LISTENING replaces Welcome/Conversation,
      // and mobile browsers keep sending that finger's touch events to the removed node, so they
      // never reach window. Listening on the node itself still catches them.
      const onTouchMove = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (t) moved(t.clientX, t.clientY);
      };
      const onTouchEnd = () => {
        if (active.current) void release();
      };
      const onUp = (e: globalThis.PointerEvent) => {
        if (active.current && e.pointerId === active.current.pointerId) void release();
      };
      const onPointerCancel = (e: globalThis.PointerEvent) => {
        if (active.current && e.pointerId === active.current.pointerId) cancel();
      };
      const onKeyUp = (e: globalThis.KeyboardEvent) => {
        if (active.current && e.key === active.current.key) void release();
      };
      const onHidden = () => document.visibilityState === "hidden" && cancel();
      const onBlur = () => cancel();

      // No scroll/zoom gesture may steal the finger (that would fire pointercancel mid-hold).
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.touchAction = "none";
      el?.addEventListener("pointerup", onUp);
      el?.addEventListener("touchmove", onTouchMove, { passive: true });
      el?.addEventListener("touchend", onTouchEnd);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onPointerCancel);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
      document.addEventListener("visibilitychange", onHidden);
      detach.current = () => {
        document.body.style.touchAction = prevTouchAction;
        el?.removeEventListener("pointerup", onUp);
        el?.removeEventListener("touchmove", onTouchMove);
        el?.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onHidden);
      };

      timers.current.tick = setInterval(() => {
        if (!active.current) return;
        const elapsedMs = performance.now() - active.current.startedAt;
        setState((s) => (s.holding ? { ...s, elapsedMs } : s));
      }, 250);
      timers.current.cap = setTimeout(() => void release(), MAX_HOLD_MS);

      stt
        .start(
          (interim) => active.current && setState((s) => ({ ...s, interim })),
          (final) => active.current && setState((s) => ({ ...s, final })),
          (level) => {
            if (!active.current) return;
            levels.current = [...levels.current.slice(1), level];
            const snapshot = levels.current;
            setState((s) => ({ ...s, level, levels: snapshot }));
          },
          { lang: cb.current.lang, expect: cb.current.expect, question: cb.current.question },
        )
        .catch((e: unknown) => {
          // Mic denied or missing: back where the hold started, then the "Can't hear you" sheet.
          // Already released: release() gets the same error from stt.stop() and handles it.
          if (gen !== generation.current || !active.current) return;
          generation.current++;
          cleanup();
          stt.cancel();
          setState(IDLE);
          cb.current.onCancel();
          cb.current.onError(e instanceof ServiceError && e.state !== "invalid-email" ? e.state : "mic");
        });
    },
    [cancel, cleanup, release, stt],
  );

  const buttonProps: HoldButtonProps = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const el = e.currentTarget;
      // Touch pointers are implicitly captured by the pressed button. It unmounts when the screen
      // switches to LISTENING, so release the capture: later pointer events then go to whatever is
      // under the finger and bubble to window as usual.
      try {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch {
        // not captured
      }
      begin(e.pointerId, null, el.getBoundingClientRect(), el);
    },
    onKeyDown: (e) => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      e.preventDefault();
      begin(null, e.key, null);
    },
    onContextMenu: (e) => e.preventDefault(),
  };

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, buttonProps, releaseEl, release, cancel, abort };
}
