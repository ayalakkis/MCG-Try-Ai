import type { CSSProperties, ReactNode } from "react";
import s from "./SectionLabel.module.css";

export default function SectionLabel({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <span className={[s.lbl, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </span>
  );
}
