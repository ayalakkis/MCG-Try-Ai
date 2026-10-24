"use client";
import type { CSSProperties } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import s from "./BrandLine.module.css";

/**
 * MCG's continuous line: pink dot at the start, orange dot at the end.
 * The path morphs to its mirrored wave and back every 7 s; the dots pulse every 2.4 s.
 * Paths are copied verbatim from design/screens/01-welcome.html and 07-thanks.html.
 */
const PRESETS = {
  welcome: {
    viewBox: "0 0 560 480",
    d: "M20 380 C 90 380 110 240 190 280 S 280 380 320 260 S 420 90 500 170 S 560 240 590 120",
    alt: "M20 380 C 90 135 110 240 190 210 S 280 135 320 225 S 420 352.5 500 292.5 S 560 240 590 120",
    start: [20, 380],
    end: [590, 120],
  },
  thanks: {
    viewBox: "0 0 600 260",
    d: "M20 80 C 90 80 120 210 200 170 S 270 60 300 130 S 400 250 470 180 S 560 60 580 190",
    alt: "M20 80 C 90 167.5 120 70 200 100 S 270 182.5 300 130 S 400 40 470 92.5 S 560 182.5 580 190",
    start: [20, 80],
    end: [580, 190],
  },
} as const;

interface BrandLineProps {
  variant: keyof typeof PRESETS;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  dotRadius?: number;
}

export default function BrandLine({ variant, className, style, strokeWidth = 2.5, dotRadius = 9 }: BrandLineProps) {
  const reduced = useReducedMotion();
  const p = PRESETS[variant];
  const rPulse = `${dotRadius};${+(dotRadius * 1.3556).toFixed(1)};${dotRadius}`; // 9 → 12.2 → 9
  return (
    <svg className={className ? `${s.line} ${className}` : s.line} viewBox={p.viewBox} style={style} aria-hidden="true">
      <path d={p.d} fill="none" stroke="#144074" strokeWidth={strokeWidth} strokeLinecap="round">
        {!reduced && (
          <animate
            attributeName="d"
            dur="7s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines=".45 0 .55 1;.45 0 .55 1"
            values={`${p.d};${p.alt};${p.d}`}
          />
        )}
      </path>
      <circle cx={p.start[0]} cy={p.start[1]} r={dotRadius} fill="#E5418C">
        {!reduced && <animate attributeName="r" dur="2.4s" repeatCount="indefinite" values={rPulse} />}
      </circle>
      <circle cx={p.end[0]} cy={p.end[1]} r={dotRadius} fill="#EF8E0A">
        {!reduced && <animate attributeName="r" dur="2.4s" repeatCount="indefinite" values={rPulse} />}
      </circle>
    </svg>
  );
}
