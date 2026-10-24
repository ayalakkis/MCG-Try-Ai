import type { CSSProperties, ElementType, ReactNode } from "react";
import s from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  /** "plain" = border + shadow only; "content" adds the preview card radius/padding. */
  variant?: "plain" | "content";
  dark?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

export default function Card({ children, variant = "plain", dark, as: Tag = "div", className, style, ...rest }: CardProps) {
  const cls = [s.card, variant === "content" ? s.content : "", dark ? s.dark : "", className].filter(Boolean).join(" ");
  return (
    <Tag className={cls} style={style} {...rest}>
      {children}
    </Tag>
  );
}
