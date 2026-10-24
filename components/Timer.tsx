import s from "./Timer.module.css";

/** "00:07", the same counter style as 02-listening. */
export const mmss = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

interface TimerProps {
  /** Real elapsed time in ms. */
  ms: number;
  label: string;
  className?: string;
}

/** Minimal live timer shown while the AI works, before a result appears. */
export default function Timer({ ms, label, className }: TimerProps) {
  return (
    <span className={[s.timer, className].filter(Boolean).join(" ")} role="timer" aria-label={label}>
      <span className={s.dot} aria-hidden="true" />
      {mmss(ms)}
    </span>
  );
}
