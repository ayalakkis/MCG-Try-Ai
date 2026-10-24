"use client";
/**
 * Inactivity (HANDOFF.md §7): no tap for 60 s (90 s on Email) → "Still there?" sheet
 * with a 10 s countdown → onTimeout (wipe + Welcome). Any tap restarts the clock;
 * `busy` (finger held on the mic button) counts as activity the whole time it lasts. Typing, the AI
 * thinking and the AI speaking do not reset the clock (MCG's choice).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "./config";

/** What the InactivityRing shows. */
export interface IdleInfo {
  seconds: number;
  /** 1 = full ring, 0 = empty. */
  progress: number;
}

interface Options {
  enabled: boolean;
  /** Seconds before the "Still there?" sheet. */
  timeout: number;
  busy: boolean;
  /** Restart the clock when this changes (screen change). */
  resetKey: string;
  onTimeout: () => void;
}

const TICK_MS = 250;

export function useInactivity({ enabled, timeout, busy, resetKey, onTimeout }: Options) {
  const [last, setLast] = useState(0);
  const [now, setNow] = useState(0);
  const cb = useRef(onTimeout);
  const busyRef = useRef(busy);
  useEffect(() => {
    cb.current = onTimeout;
    busyRef.current = busy;
  });

  const touch = useCallback(() => {
    const t = performance.now();
    setLast(t);
    setNow(t);
  }, []);

  // New screen, or voice activity starting/stopping: the clock starts again on the next tick.
  const restart = useRef(true);
  useEffect(() => {
    restart.current = true;
  }, [resetKey, enabled, busy]);

  useEffect(() => {
    if (!enabled) return;
    // Only flag activity here: setting React state inside a keydown/input listener re-renders
    // before React's own onChange runs and wipes what the visitor just typed. The tick applies it.
    let active = false;
    const flag = () => {
      active = true;
    };
    const events = ["pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, flag, { passive: true, capture: true }));
    const tick = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (busyRef.current || active || restart.current) setLast(t);
      active = false;
      restart.current = false;
    }, TICK_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, flag, { capture: true }));
      clearInterval(tick);
      // Start the next enabled stretch from zero (never from the last visitor's idle time).
      const t = performance.now();
      setLast(t);
      setNow(t);
    };
  }, [enabled]);

  const idleS = enabled ? Math.max(0, (now - last) / 1000) : 0;
  const warning = enabled && idleS >= timeout;
  const warnLeft = Math.max(0, Math.ceil(timeout + config.timers.stillThere - idleS));
  const expired = enabled && idleS >= timeout + config.timers.stillThere;

  useEffect(() => {
    if (expired) cb.current();
  }, [expired]);

  const left = Math.max(0, timeout - idleS);
  const info: IdleInfo = { seconds: Math.ceil(left), progress: left / timeout };
  return { info, warning, warnLeft, stillHere: touch };
}

/** Plain countdown (Thank you: 15 → 0), restarted by `key`. */
export function useCountdown(seconds: number, running: boolean, key: string, onDone: () => void) {
  const [state, setState] = useState({ key: "", left: seconds });
  const left = running && state.key === key ? state.left : seconds;
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  });
  useEffect(() => {
    if (!running) return;
    const end = performance.now() + seconds * 1000;
    const tick = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - performance.now()) / 1000));
      setState({ key, left: s });
      if (s === 0) {
        clearInterval(tick);
        cb.current();
      }
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [running, seconds, key]);
  return left;
}
