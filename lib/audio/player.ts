/**
 * Plays TTS audio (WAV from /api/speak) through the shared AudioContext and reports the
 * envelope 0–1 from an AnalyserNode, which drives the Orb "speak" pulse.
 */
import { frameLoop, getAudioContext, levelOf } from "./context";

export class Player {
  private source: AudioBufferSourceNode | null = null;
  private stopLevels: (() => void) | null = null;
  private finish: (() => void) | null = null;
  /** Bumped by stop(), so a line stopped while it was still decoding never starts. */
  private generation = 0;

  /** Resolves when playback ends or stop() is called. */
  async play(data: ArrayBuffer, onLevel?: (level: number) => void): Promise<void> {
    this.stop();
    const generation = this.generation;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state !== "running") await ctx.resume().catch(() => {});
    const buffer = await ctx.decodeAudioData(data.slice(0));
    if (generation !== this.generation) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    this.source = source;

    await new Promise<void>((resolve) => {
      this.finish = resolve;
      source.onended = () => this.stop();
      if (onLevel) {
        const buf = new Float32Array(analyser.fftSize);
        this.stopLevels = frameLoop(() => onLevel(levelOf(analyser, buf)), 40);
      }
      source.start();
    });
  }

  stop(): void {
    this.generation++;
    this.stopLevels?.();
    this.stopLevels = null;
    const source = this.source;
    this.source = null;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // not started / already ended
      }
      source.disconnect();
    }
    const done = this.finish;
    this.finish = null;
    done?.();
  }
}
