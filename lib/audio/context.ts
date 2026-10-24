/**
 * One shared AudioContext for the recorder (mic levels) and the player (TTS envelope).
 * iPad Safari only lets audio start after a user gesture, so `unlockAudio()` runs on the first
 * touch anywhere (app/page.tsx) and resumes the context; later TTS playback then just works.
 */

let ctx: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call from a touch/click handler. Resumes the context and plays one silent frame (iOS unlock). */
export function unlockAudio(): void {
  const c = getAudioContext();
  if (!c) return;
  if (c.state !== "running") void c.resume().catch(() => {});
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22_050);
    src.connect(c.destination);
    src.start(0);
  } catch {
    // ignore: unlocking is best-effort
  }
}

/**
 * RMS of the analyser's current frame mapped to 0–1 on a dB scale
 * (-55 dB → 0, -12 dB → 1), which tracks speech loudness the way the eye expects.
 */
export function levelOf(analyser: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / buf.length);
  if (rms <= 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (db + 55) / 43));
}

/** Calls `fn` about every `ms` on animation frames until the returned stop() is called. */
export function frameLoop(fn: () => void, ms = 50): () => void {
  let raf = 0;
  let last = 0;
  const step = (t: number) => {
    if (t - last >= ms) {
      last = t;
      fn();
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
