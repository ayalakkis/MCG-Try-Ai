"use client";
/**
 * /voice-lab: hidden test bench for the real voice pipeline (not linked anywhere).
 * Hold to record → /api/transcribe → transcript; type text → /api/speak → hear it.
 * Shows the latency of each step. Needs GEMINI_API_KEY on the server and HTTPS on the iPad.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { MicIcon } from "@/components/icons";
import Orb from "@/components/Orb";
import { captionsAvailable, isIOS } from "@/lib/audio/captions";
import { unlockAudio } from "@/lib/audio/context";
import { config } from "@/lib/config";
import { LANGS, type Lang } from "@/lib/i18n";
import type { ErrorState } from "@/lib/schemas";
import { HttpSpeechToText, HttpTextToSpeech } from "@/lib/services/http";
import { useHoldToTalk } from "@/lib/useHoldToTalk";
import s from "./voice-lab.module.css";

type CaptionMode = "auto" | "on" | "off";

const noSubscribe = () => () => {};

/** Browser facts that decide whether voice works here (computed on the client only). */
function describeEnv(mode: CaptionMode): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus"].filter((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t));
  return [
    `secure context: ${window.isSecureContext} (the mic needs HTTPS outside localhost)`,
    `iOS / iPadOS: ${isIOS()}`,
    `MediaRecorder types: ${types.join(", ") || "none"}`,
    `browser live captions (${mode}): ${captionsAvailable(mode)}`,
  ].join("\n");
}

const ERRORS: Record<ErrorState, string> = {
  mic: "Mic denied or unavailable → “Can’t hear you” sheet",
  missed: "Nothing intelligible → “Didn’t catch that” sheet",
  reconnecting: "Request failed → “Reconnecting” (is GEMINI_API_KEY set on the server?)",
  "invalid-email": "Unexpected error",
};

export default function VoiceLab() {
  const [lang, setLang] = useState<Lang>("ar");
  const [mode, setMode] = useState<CaptionMode>(config.voice.liveCaptions);
  const stt = useMemo(() => new HttpSpeechToText(mode), [mode]);
  const tts = useMemo(() => new HttpTextToSpeech(), []);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [sttTimes, setSttTimes] = useState("");
  const [text, setText] = useState("مرحباً! ما نوع مشروعك؟ وأين يقع؟");
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [ttsTimes, setTtsTimes] = useState("");
  const env = useSyncExternalStore(noSubscribe, () => describeEnv(mode), () => "");
  const released = useRef(0);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, { capture: true });
    return () => window.removeEventListener("pointerdown", unlockAudio, { capture: true });
  }, []);

  const hold = useHoldToTalk({
    stt,
    lang,
    onStart: () => {
      tts.stop();
      setError("");
      setTranscript("");
      setSttTimes("");
    },
    onSend: (t) => {
      setTranscript(t);
      const l = stt.last;
      const total = Math.round(performance.now() - released.current);
      if (l) {
        setSttTimes(
          `recording: ${l.recordMs} ms, ${(l.bytes / 1024).toFixed(1)} KB, ${l.mimeType}\n` +
            `upload + Gemini transcription: ${l.transcribeMs} ms\n` +
            `finger up → text on screen: ${total} ms`,
        );
      }
    },
    onCancel: () => {},
    onError: (state) => setError(ERRORS[state]),
  });

  // Time from finger up to the transcript.
  useEffect(() => {
    if (hold.state.transcribing) released.current = performance.now();
  }, [hold.state.transcribing]);

  const speak = async () => {
    setTtsTimes("");
    setSpeaking(true);
    const t0 = performance.now();
    let first = 0;
    await tts.speak(text, LANGS[lang].speechLang, (l) => {
      if (!first && l > 0.02) first = performance.now();
      setLevel(l);
    });
    const end = performance.now();
    setSpeaking(false);
    setLevel(0);
    const l = tts.last;
    setTtsTimes(
      l
        ? `request → WAV received (Gemini TTS): ${l.fetchMs} ms, ${(l.bytes / 1024).toFixed(1)} KB\n` +
            `request → first sound: ${first ? Math.round(first - t0) : "?"} ms\n` +
            `request → playback ended: ${Math.round(end - t0)} ms`
        : "No audio: check the browser console and the server log.",
    );
  };

  const h = hold.state;
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <h1 className={s.h1}>Voice lab</h1>
        <p className={s.note}>
          Internal test page. Transcription <b>{config.models.transcription}</b> · TTS <b>{config.models.tts}</b>, voice <b>{config.models.ttsVoice}</b>. Audio is never stored.
        </p>

        <section className={s.card}>
          <h2 className={s.h2}>1 · Hold to talk → transcript</h2>
          <div className={s.row}>
            <label>
              Screen language{" "}
              <select className={s.select} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              Browser captions{" "}
              <select className={s.select} value={mode} onChange={(e) => setMode(e.target.value as CaptionMode)}>
                <option value="auto">auto (off on iPad)</option>
                <option value="on">on</option>
                <option value="off">off</option>
              </select>
            </label>
          </div>
          <div className={s.row}>
            <PrimaryButton className={s.hold} pressed={h.holding} {...hold.buttonProps}>
              <MicIcon />
              {h.holding ? "Release to send" : h.transcribing ? "Transcribing…" : "Hold to talk"}
            </PrimaryButton>
            <Orb state={h.transcribing ? "think" : h.holding ? "listen" : "idle"} size={88} level={h.holding ? h.level : undefined} />
            <div className={s.meter} aria-label="Mic level">
              <i style={{ width: `${h.level * 100}%` }} />
            </div>
          </div>
          <p className={s.text} dir="auto">
            {h.holding ? (
              <>
                {h.final} <span className={s.interim}>{h.interim}</span>
              </>
            ) : (
              transcript
            )}
          </p>
          {error && <p className={s.error}>{error}</p>}
          {sttTimes && <p className={s.times}>{sttTimes}</p>}
        </section>

        <section className={s.card}>
          <h2 className={s.h2}>2 · Text → voice</h2>
          <textarea className={s.textarea} dir="auto" value={text} onChange={(e) => setText(e.target.value)} maxLength={config.voice.maxSpeakChars} />
          <div className={s.row}>
            <PrimaryButton className={s.btn} onClick={() => void speak()} disabled={speaking || !text.trim()}>
              {speaking ? "Speaking…" : "Speak"}
            </PrimaryButton>
            <SecondaryButton className={s.btn} onClick={() => tts.stop()}>
              Stop
            </SecondaryButton>
            <Orb state="speak" size={88} level={speaking ? level : 0} />
          </div>
          {ttsTimes && <p className={s.times}>{ttsTimes}</p>}
        </section>

        <section className={s.card}>
          <h2 className={s.h2}>Environment</h2>
          <p className={s.times}>{env}</p>
        </section>
      </div>
    </main>
  );
}
