"use client";
import BrandLine from "@/components/BrandLine";
import { PrimaryButton } from "@/components/Buttons";
import GreetingDots from "@/components/GreetingDots";
import Header from "@/components/Header";
import { CheckIcon, InstagramIcon, RestartIcon, WhatsAppIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import QrCode from "@/components/QrCode";
import { Canvas } from "@/components/Stage";
import { config } from "@/lib/config";
import type { Dict, Lang } from "@/lib/i18n";
import s from "./Thanks.module.css";

interface ThanksProps {
  t: Dict;
  lang: Lang;
  onLang: (lang: Lang) => void;
  name: string;
  email: string;
  /** Countdown to the automatic reset (15 → 0). */
  secondsLeft: number;
  onStartOver: () => void;
}

export default function Thanks({ t, lang, onLang, name, email, secondsLeft, onStartOver }: ThanksProps) {
  const pct = `${(secondsLeft / config.timers.thanks) * 100}%`;
  return (
    <Canvas>
      <Header lang={lang} onLang={onLang} logoAlt={t.common.logoAlt} />

      <div className={s.body}>
        <div className={s.left}>
          <div className={s.visual}>
            <BrandLine variant="thanks" className={s.line} />
            <Orb state="idle" size={260} />
            <span className={s.badge} aria-hidden="true">
              <CheckIcon />
            </span>
          </div>
          <div className={`grad ${s.thanks}`}>
            {t.thanks.thankYou(name)}
            <GreetingDots />
          </div>
          <h1 className={s.title}>{t.thanks.onItsWay}</h1>
          <p className={`muted ${s.email}`} dir="ltr">
            {email}
          </p>
        </div>

        <div className={s.right}>
          <h2 className={s.make}>{t.thanks.makeItHappen}</h2>
          <div className={s.qrs}>
            <div className={s.card}>
              <QrCode value={config.links.whatsapp} size={160} label={t.thanks.whatsappQr} />
              <span className={s.qrLabel}>
                <WhatsAppIcon />
                {t.thanks.whatsapp}
              </span>
            </div>
            <div className={s.card}>
              <QrCode value={config.links.instagram} size={160} label={t.thanks.instagramQr} />
              <span className={s.qrLabel}>
                <InstagramIcon />
                {t.thanks.instagram}
              </span>
            </div>
          </div>
          <div className={s.bottom}>
            <span className={s.countdown} role="timer" aria-live="off">
              <span className={s.cd} style={{ background: `conic-gradient(#144074 0 ${pct}, #DFE9F3 ${pct} 100%)` }} />
              {secondsLeft}
            </span>
            <PrimaryButton className={s.again} onClick={onStartOver}>
              <RestartIcon />
              {t.common.startOver}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Canvas>
  );
}
