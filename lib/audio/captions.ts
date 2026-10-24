/**
 * Live captions from the browser's SpeechRecognition (interim text only; the transcript that
 * counts always comes from /api/transcribe). Missing or failing recognition is silently ignored:
 * the waveform shows instead, then the final text.
 */
import { config } from "../config";
import type { Lang } from "../i18n";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** iPadOS reports itself as a Mac; touch points give it away. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function captionsAvailable(mode: "auto" | "on" | "off" = config.voice.liveCaptions): boolean {
  if (mode === "off" || !ctor()) return false;
  return mode === "on" || !isIOS();
}

export class LiveCaptions {
  private rec: Recognition | null = null;

  start(lang: Lang, onFinal: (text: string) => void, onPartial: (text: string) => void, mode = config.voice.liveCaptions): boolean {
    const Ctor = ctor();
    if (!Ctor || !captionsAvailable(mode)) return false;
    try {
      const rec = new Ctor();
      rec.lang = lang === "ar" ? "ar-KW" : "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        onFinal(final.trim());
        onPartial(interim.trim());
      };
      rec.onerror = () => this.stop();
      rec.start();
      this.rec = rec;
      return true;
    } catch {
      this.rec = null;
      return false;
    }
  }

  stop(): void {
    try {
      this.rec?.abort();
    } catch {
      // ignore
    }
    this.rec = null;
  }
}
