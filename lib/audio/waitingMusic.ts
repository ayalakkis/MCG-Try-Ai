/**
 * Cute waiting music for the CREATE screen, generated with Web Audio (no file, no licence): a bouncy
 * music-box melody over a light pad and a soft bass "boop", on C → G → Am → F (2.4 s each, ~100 bpm).
 * Fades in on start and out on stop. Uses the shared AudioContext, which the visitor's earlier taps have
 * already unlocked on iPad.
 */
import { getAudioContext } from "./context";

const VOLUME = 0.2;
const BAR = 2.4; // seconds per chord
const STEP = BAR / 8; // one melody note slot (an eighth note)
const LOOKAHEAD = 1.2; // seconds scheduled ahead

/** MIDI notes per chord: pad, bass, and an 8-slot music-box melody (null = rest). */
const BARS: { pad: number[]; bass: number; tune: (number | null)[] }[] = [
  { pad: [60, 64, 67], bass: 48, tune: [84, 88, 91, 88, 96, null, 91, null] }, // C
  { pad: [59, 62, 67], bass: 43, tune: [86, 91, 95, 91, 98, null, 95, null] }, // G
  { pad: [57, 60, 64], bass: 45, tune: [84, 88, 93, 88, 96, null, 93, 91] }, // Am
  { pad: [57, 60, 65], bass: 41, tune: [84, 89, 93, 89, 96, 93, 91, 89] }, // F
];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBar = 0;
let barIndex = 0;

/** Airy sine pad that swells in and overlaps into the next chord. */
function pad(c: AudioContext, out: AudioNode, notes: number[], at: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.05, at + 0.6);
  g.gain.setValueAtTime(0.05, at + BAR - 0.2);
  g.gain.linearRampToValueAtTime(0, at + BAR + 0.6);
  g.connect(out);
  for (const n of notes) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = hz(n);
    o.connect(g);
    o.start(at);
    o.stop(at + BAR + 0.7);
  }
}

/** Music-box pluck: a sine with a quieter octave above, fast attack, short ringing decay. */
function pluck(c: AudioContext, out: AudioNode, note: number, at: number, level: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(level, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  g.connect(out);
  const partials: [number, number][] = [[1, 1], [2, 0.25], [3, 0.08]];
  for (const [mult, amp] of partials) {
    const pg = c.createGain();
    pg.gain.value = amp;
    pg.connect(g);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = hz(note) * mult;
    o.connect(pg);
    o.start(at);
    o.stop(at + 1);
  }
}

/** Soft round bass "boop" with a tiny downward pitch bend. */
function boop(c: AudioContext, out: AudioNode, note: number, at: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.12, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
  g.connect(out);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(hz(note) * 1.06, at);
  o.frequency.exponentialRampToValueAtTime(hz(note), at + 0.08);
  o.connect(g);
  o.start(at);
  o.stop(at + 0.5);
}

function schedule(c: AudioContext) {
  if (!master) return;
  while (nextBar < c.currentTime + LOOKAHEAD) {
    const bar = BARS[barIndex % BARS.length];
    pad(c, master, bar.pad, nextBar);
    boop(c, master, bar.bass, nextBar);
    boop(c, master, bar.bass, nextBar + 4 * STEP);
    bar.tune.forEach((n, i) => {
      if (n !== null) pluck(c, master!, n, nextBar + i * STEP, i % 4 === 0 ? 0.09 : 0.065);
    });
    nextBar += BAR;
    barIndex++;
  }
}

export function startWaitingMusic(): void {
  const c = getAudioContext();
  if (!c || master) return;
  if (c.state !== "running") void c.resume().catch(() => {});
  master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(VOLUME, c.currentTime + 1.5);
  master.connect(c.destination);
  nextBar = c.currentTime + 0.05;
  barIndex = 0;
  schedule(c);
  timer = setInterval(() => schedule(c), 200);
}

export function stopWaitingMusic(fade = 1.2): void {
  const c = getAudioContext();
  if (timer) clearInterval(timer);
  timer = null;
  if (!c || !master) return;
  const m = master;
  master = null;
  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(m.gain.value, c.currentTime);
  m.gain.linearRampToValueAtTime(0, c.currentTime + fade);
  setTimeout(() => m.disconnect(), (fade + 0.2) * 1000);
}
