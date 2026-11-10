// First-game tips: which one the person is on, kept on this device.
import { useSyncExternalStore } from "react";

const KEY = "ec-coach";
export const COACH_DONE = 3;

export const COACH_TIPS = [
  { icon: "👆", text: "Tap a card to select it. Press and hold a card to read what it does." },
  { icon: "▶️", text: "Tap Play to use the selected card, or double-tap or swipe a card up. Play as many as you like." },
  { icon: "🐔", text: "Draw from the pile to end your turn. Drawing a 💥 knocks you out, unless you have a 🧯 to put it out." },
];

const listeners = new Set<() => void>();

function read(): number {
  try {
    const n = Number(localStorage.getItem(KEY) ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return COACH_DONE; // no storage: don't nag every game
  }
}

let step = read();

function write(n: number) {
  step = n;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Move on to tip `n`, never backwards. */
export const advanceCoach = (n: number) => n > step && write(Math.min(n, COACH_DONE));
export const skipCoach = () => write(COACH_DONE);
export const resetCoach = () => write(0);

export function useCoachStep(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => step,
  );
}
