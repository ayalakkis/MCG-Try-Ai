import { create } from "qrcode";
import { useMemo } from "react";
import s from "./QrCode.module.css";

interface QrCodeProps {
  /** Encoded URL (config.links.*). */
  value: string;
  /** Outer size incl. the 10 px white border (160 in 07-thanks.html). */
  size: number;
  label: string;
}

/**
 * Real, scannable QR code drawn as one SVG path (synchronous, so it renders on the server
 * and on first paint). Frame styling (.qr) from design/screens/07-thanks.html.
 */
export default function QrCode({ value, size, label }: QrCodeProps) {
  const { n, d } = useMemo(() => {
    const qr = create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    return { n, d };
  }, [value]);

  return (
    <div className={s.qr} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true">
        <path d={d} fill="#144074" />
      </svg>
    </div>
  );
}
