/** Line icons copied from design/screens (24×24, stroke 1.7, sized via font-size). */
import type { CSSProperties } from "react";

type P = { style?: CSSProperties; className?: string };
const cls = (c?: string) => (c ? `i ${c}` : "i");

export const MicIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
    <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
  </svg>
);

export const MicOffIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
    <path d="M19 11a7 7 0 0 1-14 0M12 18v3M4 4l16 16" />
  </svg>
);

export const CupIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
    <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
    <path d="M8 3v3M12 3v3" />
  </svg>
);

export const MoonIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export const BagIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const RestartIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const CheckIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const MailIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);

export const ArrowIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const AlertIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);

export const WifiOffIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.9M10.5 5.1A15 15 0 0 1 22 9.5" />
    <circle cx="12" cy="20" r=".6" />
  </svg>
);

export const WhatsAppIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" />
  </svg>
);

export const InstagramIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="17" cy="7" r=".6" />
  </svg>
);

/* Strategy departments (PREVIEW cards + detail sheet) */
export const MegaphoneIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const PhoneIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <rect x="6.5" y="3" width="11" height="18" rx="2.5" />
    <path d="M10.5 17.5h3" />
  </svg>
);

export const StarIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

export const CalendarIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M4 10h16M8.5 3v4M15.5 3v4" />
  </svg>
);

export const GiftIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <rect x="4" y="9" width="16" height="11" rx="1.5" />
    <path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5-4-5.5-2S9 9 12 9zM12 9c1.5-3.5 5-4 5.5-2S15 9 12 9z" />
  </svg>
);

export const WalletIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <rect x="4" y="8" width="16" height="11" rx="2.5" />
    <path d="M16 13.5h2" />
  </svg>
);

export const CloseIcon = ({ style, className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
