import Image from "next/image";
import type { Lang } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n";
import { SecondaryButton } from "./Buttons";
import { RestartIcon } from "./icons";
import s from "./Header.module.css";

interface HeaderProps {
  lang: Lang;
  onLang: (lang: Lang) => void;
  logoAlt: string;
  /** Hidden on Welcome and Thank you. */
  startOverLabel?: string;
  onStartOver?: () => void;
}

export default function Header({ lang, onLang, logoAlt, startOverLabel, onStartOver }: HeaderProps) {
  // Active language sits first in reading order (rtl-arabic-*.html shows عربي | EN).
  const order: Lang[] = lang === "ar" ? ["ar", "en"] : ["en", "ar"];
  return (
    <header className={s.header}>
      <Image src="/brand/mcg-mark-color.png" alt={logoAlt} width={900} height={345} priority className={s.logo} />
      <div className={s.right}>
        {startOverLabel && onStartOver && (
          <SecondaryButton className={s.startOver} onClick={onStartOver}>
            <RestartIcon />
            {startOverLabel}
          </SecondaryButton>
        )}
        <div className={s.seg} role="group" aria-label="Language">
          {order.map((l) => (
            <button
              key={l}
              type="button"
              className={[l === lang ? s.on : "", l === "ar" ? s.ar : s.en].join(" ")}
              aria-pressed={l === lang}
              lang={LANGS[l].htmlLang}
              onClick={() => onLang(l)}
            >
              {LANGS[l].label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
