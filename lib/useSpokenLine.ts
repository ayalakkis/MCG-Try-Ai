"use client";
/**
 * Speaks one line, in the screen language, when a screen opens and exposes the audio envelope
 * for the orb's "speak" state. Stops when the screen changes or the visitor resets.
 */
import { useEffect, useState } from "react";
import { LANGS, type Lang } from "./i18n";
import type { TextToSpeech } from "./services/interfaces";

export function useSpokenLine(tts: TextToSpeech, text: string | null, key: string, lang: Lang) {
  /** The key whose line has finished (speaking = there is a line and it isn't done yet). */
  const [done, setDone] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!text) return;
    let live = true;
    tts
      .speak(text, LANGS[lang].speechLang, (l) => {
        if (live) setLevel(l);
      })
      .catch(() => {})
      .then(() => {
        if (!live) return;
        setDone(key);
        setLevel(0);
      });
    return () => {
      live = false;
      tts.stop();
    };
    // `key` identifies the moment (screen + session); the text itself may re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!text, lang]);

  const speaking = !!text && done !== key;
  return { speaking, level: speaking ? level : 0 };
}
