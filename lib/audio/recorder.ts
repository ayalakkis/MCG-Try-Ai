/**
 * Mic capture while "Hold to talk" is held (MediaRecorder + AnalyserNode for live levels).
 * Works in iPad Safari (records audio/mp4 AAC) and Chrome (audio/webm Opus).
 * Audio lives only in memory until it is uploaded once for transcription; nothing is stored.
 */
import { ServiceError } from "../services/errors";
import { frameLoop, getAudioContext, levelOf } from "./context";

/** First supported type wins. Safari: mp4/AAC; Chrome/Firefox: webm/ogg Opus. */
const TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

function pickType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export class Recorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private source: MediaStreamAudioSourceNode | null = null;
  private stopLevels: (() => void) | null = null;
  private starting: Promise<void> | null = null;
  private startedAt = 0;
  private cancelled = false;

  /** Asks for the mic and starts recording. Rejects with ServiceError("mic") if there is none. */
  start(onLevel?: (level: number) => void): Promise<void> {
    this.cancelled = false;
    this.starting = this.open(onLevel);
    return this.starting;
  }

  private async open(onLevel?: (level: number) => void) {
    // Create/resume the context inside the touch handler, before the first await.
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "running") void ctx.resume().catch(() => {});

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new ServiceError("mic", "mic_unsupported");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      throw new ServiceError("mic", name === "NotAllowedError" || name === "SecurityError" ? "mic_denied" : "mic_unavailable");
    }
    if (this.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;

    const mimeType = pickType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : undefined);
    this.chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    // Timeslice: Safari otherwise may only flush data on stop().
    recorder.start(250);
    this.recorder = recorder;
    this.startedAt = performance.now();

    if (ctx && onLevel) {
      this.source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      this.source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      this.stopLevels = frameLoop(() => onLevel(levelOf(analyser, buf)));
    }
  }

  /** Stops and returns the recording. */
  async stop(): Promise<Recording> {
    await this.starting?.catch(() => {});
    const recorder = this.recorder;
    if (!recorder) {
      this.release();
      throw new ServiceError("mic", "not_recording");
    }
    const durationMs = performance.now() - this.startedAt;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType || "audio/mp4" }));
      try {
        recorder.stop();
      } catch {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || "audio/mp4" }));
      }
    });
    this.release();
    return { blob, mimeType: blob.type, durationMs };
  }

  /** Discards everything (finger slid off the button). */
  cancel(): void {
    this.cancelled = true;
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // already stopped
      }
    }
    this.release();
  }

  private release() {
    this.stopLevels?.();
    this.stopLevels = null;
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((t) => t.stop()); // mic indicator off
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}
