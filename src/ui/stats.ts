// Lifetime tally on this device, shown on the start screen and after each game.
import type { Difficulty } from "../game";

const KEY = "ec-stats";

export interface LevelRecord {
  games: number;
  wins: number;
  /** Best place finished (1 = won), or 0 before any game at this level. */
  best: number;
}

export interface Stats {
  /** Every game, both modes. */
  games: number;
  explosions: number;
  /** Solo games the person won, all levels. */
  wins: number;
  /** Solo games by bot difficulty. */
  byLevel: Record<Difficulty, LevelRecord>;
  /** Solo wins in a row, now and at best. */
  streak: number;
  bestStreak: number;
}

const empty = (): Stats => ({
  games: 0,
  explosions: 0,
  wins: 0,
  byLevel: { chick: { games: 0, wins: 0, best: 0 }, hen: { games: 0, wins: 0, best: 0 }, rooster: { games: 0, wins: 0, best: 0 } },
  streak: 0,
  bestStreak: 0,
});

export function loadStats(): Stats {
  const base = empty();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // Older tallies have no byLevel or streaks: keep their totals and start the rest at zero.
    const byLevel = { ...base.byLevel };
    for (const k of Object.keys(byLevel) as Difficulty[]) byLevel[k] = { ...base.byLevel[k], ...saved.byLevel?.[k] };
    return { ...base, ...saved, byLevel };
  } catch {
    return base;
  }
}

export interface GameResult {
  explosions: number;
  /** Solo games only; pass & play just counts towards games and explosions. */
  solo: { difficulty: Difficulty; won: boolean; place: number } | null;
}

export function recordGame({ explosions, solo }: GameResult): Stats {
  const s = loadStats();
  s.games += 1;
  s.explosions += explosions;
  if (solo) {
    const level = s.byLevel[solo.difficulty];
    level.games += 1;
    level.best = level.best === 0 ? solo.place : Math.min(level.best, solo.place);
    if (solo.won) {
      level.wins += 1;
      s.wins += 1;
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    } else {
      s.streak = 0;
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  return s;
}
