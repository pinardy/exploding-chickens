import { beforeEach, describe, expect, it } from "vitest";
import { loadStats, recordGame } from "./stats";

// The tests run in Node, which has no localStorage: give them a small in-memory one.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
});

describe("stats", () => {
  it("tracks wins per difficulty, streaks and best finish", () => {
    recordGame({ explosions: 2, solo: { difficulty: "hen", won: true, place: 1 } });
    recordGame({ explosions: 2, solo: { difficulty: "hen", won: true, place: 1 } });
    recordGame({ explosions: 3, solo: { difficulty: "rooster", won: false, place: 3 } });
    recordGame({ explosions: 3, solo: { difficulty: "rooster", won: false, place: 2 } });
    const s = recordGame({ explosions: 1, solo: { difficulty: "chick", won: true, place: 1 } });

    expect(s.games).toBe(5);
    expect(s.explosions).toBe(11);
    expect(s.wins).toBe(3);
    expect(s.byLevel.hen).toEqual({ games: 2, wins: 2, best: 1 });
    expect(s.byLevel.rooster).toEqual({ games: 2, wins: 0, best: 2 });
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
    expect(loadStats()).toEqual(s);
  });

  it("counts pass & play games without touching solo records", () => {
    const s = recordGame({ explosions: 4, solo: null });
    expect(s.games).toBe(1);
    expect(s.wins).toBe(0);
    expect(s.byLevel.hen.games).toBe(0);
  });

  it("upgrades a tally saved before per-level stats existed", () => {
    store.set("ec-stats", JSON.stringify({ games: 7, explosions: 20, wins: 3 }));
    const s = loadStats();
    expect(s).toMatchObject({ games: 7, explosions: 20, wins: 3, streak: 0, bestStreak: 0 });
    expect(s.byLevel.rooster).toEqual({ games: 0, wins: 0, best: 0 });
  });
});
