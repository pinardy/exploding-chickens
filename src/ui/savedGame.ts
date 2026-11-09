// The game in progress, kept on this device so a reload (or the phone
// reclaiming the tab while you're in another app) doesn't lose it.
import type { GameSetup, GameState } from "../game";

const KEY = "ec-game";
const VERSION = 1;

export interface SavedGame {
  setup: GameSetup;
  state: GameState;
  /** Whose cards were on screen. */
  viewer: number;
}

export function saveGame(game: SavedGame) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...game }));
  } catch {
    /* storage full or blocked: the game just won't survive a reload */
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** The saved game, or null if there isn't one (or it's from an older version). */
export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { v, setup, state, viewer } = JSON.parse(raw);
    if (v !== VERSION || !setup || !state?.players?.length || state.winner !== null) return null;
    // Moments that were on screen when it was saved shouldn't replay on resume.
    return { setup, viewer: typeof viewer === "number" ? viewer : 0, state: { ...state, event: null, sfx: null, quip: null } };
  } catch {
    return null;
  }
}
