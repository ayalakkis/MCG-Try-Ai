import type { CSSProperties } from "react";
import s from "./Orb.module.css";

export type OrbState = "idle" | "listen" | "think" | "speak" | "create";

interface OrbProps {
  state: OrbState;
  /** Diameter in px. */
  size: number;
  /**
   * Live audio level 0–1 (mic RMS while listening, TTS envelope while speaking).
   * When set, it replaces the stand-in keyframes: listen maps to scale 1–1.14, speak to 1–1.07.
   */
  level?: number;
  className?: string;
  style?: CSSProperties;
}

const tier = (size: number) => (size <= 120 ? s.sm : size < 240 ? s.md : "");

export default function Orb({ state, size, level, className, style }: OrbProps) {
  const driven = level !== undefined && (state === "listen" || state === "speak");
  const lvl = Math.max(0, Math.min(1, level ?? 0));
  const scale = state === "listen" ? 1 + lvl * 0.14 : 1 + lvl * 0.07;
  // The smallest orb in the design (preview header, 64px) has no second swirl.
  const showS2 = size > 120;

  return (
    <div
      className={[s.orb, s[state], tier(size), driven ? s.driven : "", className].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        ...(driven ? { transform: `scale(${scale})`, ["--lvl" as string]: lvl } : null),
        ...style,
      }}
      aria-hidden="true"
    >
      <i className={s.g} />
      {state === "listen" && (
        <>
          <i className={s.r} />
          <i className={s.r} style={{ animationDelay: ".8s" }} />
          <i className={s.r} style={{ animationDelay: "1.6s" }} />
        </>
      )}
      {state === "create" && (
        <>
          <i className={s.o2} />
          <i className={s.o} />
        </>
      )}
      <i className={s.c} />
      <i className={s.s} />
      {showS2 && <i className={s.s2} />}
      <i className={s.h} />
      {state === "create" && (
        <>
          <i className={s.p} />
          <i className={s.p} style={{ animationDuration: "11s", animationDelay: "-4s", inset: "-24%" }} />
          <i className={s.p} style={{ animationDuration: "15s", animationDirection: "reverse", animationDelay: "-2s", inset: "-32%" }} />
        </>
      )}
    </div>
  );
}
