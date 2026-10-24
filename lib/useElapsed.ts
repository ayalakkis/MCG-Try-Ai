"use client";
/** Real time (ms) since `active` turned true; 0 while inactive. Restarts on every new wait. */
import { useEffect, useState } from "react";

const TICK_MS = 250;

export function useElapsed(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const started = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - started), TICK_MS);
    return () => {
      clearInterval(timer);
      setElapsed(0);
    };
  }, [active]);

  return active ? elapsed : 0;
}
