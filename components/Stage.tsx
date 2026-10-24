"use client";
import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import s from "./Stage.module.css";

const W = 1366;
const H = 1024;

interface StageProps {
  children: ReactNode;
  dir: "ltr" | "rtl";
  lang: string;
}

/** Dark-blue stage with the three glow blobs, fixed at 1366×1024 and scaled to fit the window. */
export default function Stage({ children, dir, lang }: StageProps) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className={s.viewport}>
      <div className={s.scaler} style={{ transform: `scale(${scale}) translate(-50%, -50%)` }}>
        <div className={s.stage} dir={dir} lang={lang}>
          <i className={s.blob} style={{ width: 700, height: 700, left: -220, top: -260, background: "#2694CF" }} />
          <i className={s.blob} style={{ width: 640, height: 640, right: -240, top: 300, background: "#125D99" }} />
          <i className={s.blob} style={{ width: 700, height: 700, left: 300, bottom: -480, background: "#1EA5E0" }} />
          {children}
        </div>
      </div>
    </div>
  );
}

/** The white rounded panel inset 20 px. */
export function Canvas({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={s.canvas} style={style}>
      {children}
    </div>
  );
}
