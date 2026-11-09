// Tiny synthesized sound effects. Everything is generated with the Web Audio API,
// so the game stays one self-contained file with nothing to download.

import type { SfxName } from "./game/state";
export type { SfxName };

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem("ec-muted") === "1";
} catch {
  /* storage unavailable */
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("ec-muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Call from a user gesture (a tap) so the browser lets audio start. */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Wave = OscillatorType;

function tone(
  c: AudioContext,
  { wave = "sine", from, to = from, at = 0, dur = 0.1, gain = 0.25, decay = true }: { wave?: Wave; from: number; to?: number; at?: number; dur?: number; gain?: number; decay?: boolean },
) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  if (decay) g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  else g.gain.setValueAtTime(gain, t0 + dur - 0.02), g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

/** One second of white noise, built once; each hit plays a random slice of it. */
function sharedNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return (noiseBuffer = buf);
}

function noise(c: AudioContext, { at = 0, dur = 0.3, gain = 0.3, filter = 1200, type = "lowpass" as BiquadFilterType, sweepTo }: { at?: number; dur?: number; gain?: number; filter?: number; type?: BiquadFilterType; sweepTo?: number }) {
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = sharedNoise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(filter, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0, Math.random() * (1 - dur), dur);
}

// A chicken-ish "bok": a square blip that bends down fast, low-passed so it sounds soft.
function bok(c: AudioContext, at: number, pitch: number) {
  tone(c, { wave: "square", from: pitch, to: pitch * 0.55, at, dur: 0.07, gain: 0.12 });
  tone(c, { wave: "sine", from: pitch * 0.5, to: pitch * 0.3, at, dur: 0.09, gain: 0.1 });
}

const SFX: Record<SfxName, (c: AudioContext) => void> = {
  pop: (c) => tone(c, { from: 520, to: 260, dur: 0.09, gain: 0.2 }),
  draw: (c) => {
    noise(c, { dur: 0.12, gain: 0.12, filter: 600, sweepTo: 3000, type: "bandpass" });
    tone(c, { wave: "triangle", from: 330, to: 660, dur: 0.1, gain: 0.08 });
  },
  cluck: (c) => {
    bok(c, 0, 820);
    bok(c, 0.11, 960);
  },
  peck: (c) => {
    bok(c, 0, 1100);
    bok(c, 0.08, 1300);
    bok(c, 0.16, 1100);
  },
  shuffle: (c) => {
    for (let i = 0; i < 8; i++) noise(c, { at: i * 0.045, dur: 0.04, gain: 0.08, filter: 2500, type: "highpass" });
  },
  peek: (c) => {
    tone(c, { from: 880, dur: 0.08, gain: 0.1 });
    tone(c, { from: 1320, at: 0.09, dur: 0.14, gain: 0.1 });
  },
  boom: (c) => {
    noise(c, { dur: 0.7, gain: 0.5, filter: 1800, sweepTo: 80 });
    tone(c, { from: 140, to: 35, dur: 0.6, gain: 0.5 });
    // a startled squawk on top
    tone(c, { wave: "sawtooth", from: 900, to: 300, at: 0.05, dur: 0.35, gain: 0.08 });
  },
  defuse: (c) => {
    noise(c, { dur: 0.45, gain: 0.25, filter: 4000, sweepTo: 600, type: "bandpass" });
    tone(c, { wave: "triangle", from: 500, to: 200, at: 0.3, dur: 0.25, gain: 0.1 });
    bok(c, 0.55, 700);
  },
  buzz: (c) => {
    tone(c, { wave: "sawtooth", from: 160, to: 120, dur: 0.28, gain: 0.14 });
    tone(c, { wave: "square", from: 164, to: 123, dur: 0.28, gain: 0.05 });
  },
  fanfare: (c) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { wave: "square", from: f, at: i * 0.12, dur: 0.16, gain: 0.08 }));
    tone(c, { wave: "square", from: 1047, at: 0.5, dur: 0.45, gain: 0.08, decay: false });
    bok(c, 0.55, 900);
    bok(c, 0.68, 1000);
    bok(c, 0.81, 1150);
  },
  pass: (c) => {
    tone(c, { from: 660, dur: 0.1, gain: 0.08 });
    tone(c, { from: 990, at: 0.1, dur: 0.18, gain: 0.08 });
  },
};

export function play(name: SfxName) {
  if (muted || !ctx) return;
  try {
    SFX[name](ctx);
  } catch {
    /* audio is best-effort */
  }
}
