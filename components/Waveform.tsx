import type { CSSProperties } from "react";
import s from "./Waveform.module.css";

export interface WaveBar {
  h: number;
  /** Stand-in keyframe offset in seconds (negative = already running). */
  delay?: number;
}

interface WaveformProps {
  bars: WaveBar[];
  barWidth: number;
  gap: number;
  height: number;
  color?: string;
  /** Live levels 0–1, one per bar (oldest → newest). Omit to use the design's looping animation. */
  levels?: number[];
  className?: string;
  style?: CSSProperties;
}

export default function Waveform({ bars, barWidth, gap, height, color, levels, className, style }: WaveformProps) {
  return (
    <span
      className={[s.wave, levels ? s.live : "", className].filter(Boolean).join(" ")}
      style={{ height, gap, ...style }}
      aria-hidden="true"
    >
      {bars.map((b, i) => (
        <i
          key={i}
          style={{
            width: barWidth,
            height: b.h,
            background: color,
            animationDelay: b.delay ? `${b.delay}s` : undefined,
            transform: levels ? `scaleY(${0.35 + 0.65 * Math.max(0, Math.min(1, levels[i] ?? 0))})` : undefined,
          }}
        />
      ))}
    </span>
  );
}
