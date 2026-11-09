// Lifetime tally on this device, shown on the start screen.
const KEY = "ec-stats";

export interface Stats {
  games: number;
  explosions: number;
  wins: number; // solo games the person won
}

export function loadStats(): Stats {
  try {
    return { games: 0, explosions: 0, wins: 0, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { games: 0, explosions: 0, wins: 0 };
  }
}

export function recordGame(explosions: number, won: boolean) {
  const s = loadStats();
  s.games += 1;
  s.explosions += explosions;
  if (won) s.wins += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
