import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import s from "./Chip.module.css";

interface ChipProps {
  children: ReactNode;
  floating?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Renders a <button> when set (e.g. email domain shortcuts). */
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
}

export default function Chip({ children, floating, className, style, onClick }: ChipProps) {
  const cls = [s.chip, floating ? s.floating : "", className].filter(Boolean).join(" ");
  return onClick ? (
    <button type="button" className={cls} style={style} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
