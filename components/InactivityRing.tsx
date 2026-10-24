import type { CSSProperties } from "react";
import s from "./InactivityRing.module.css";

interface InactivityRingProps {
  /** Ring fill 0–1. Design default shows 72%. */
  progress?: number;
  size?: number;
  /** Seconds left, already formatted ("60s"). */
  label: string;
  style?: CSSProperties;
}

/** Small inactivity ring + seconds shown bottom-right of the canvas footer. */
export default function InactivityRing({ progress = 0.72, size = 20, label, style }: InactivityRingProps) {
  const pct = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  return (
    <footer className={s.footer} style={style}>
      <span
        className={s.ring}
        style={{ width: size, height: size, background: `conic-gradient(#2694CF 0 ${pct}, #DFE9F3 ${pct} 100%)` }}
        aria-hidden="true"
      />
      {label}
    </footer>
  );
}
