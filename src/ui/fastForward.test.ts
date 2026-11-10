import { describe, expect, it } from "vitest";
import { startGame, type GameState } from "../game";
import { fastForward } from "./fastForward";

/** A fresh solo game with the person already knocked out and a bot to move. */
function youreOut(bots: number): GameState {
  const s = startGame({ mode: "solo", count: bots, difficulty: "rooster", handLimit: null, quick: false, expansion: true });
  const you = s.players[0];
  s.discard.push(...you.hand);
  you.hand = [];
  you.alive = false;
  s.outOrder = [you.id];
  s.current = 1;
  return s;
}

describe("fastForward", () => {
  it("plays the rest of a solo game out once you're out", () => {
    for (let g = 0; g < 50; g++) {
      const end = fastForward(youreOut(2 + (g % 4))); // 2-5 bots: with one, you being out would already have ended it
      expect(end.winner).not.toBeNull();
      expect(end.winner).not.toBe(0);
      expect(end.phase.type).toBe("gameOver");
      expect(end.event).toBeNull();
      expect(end.outOrder).toHaveLength(end.players.length - 1);
    }
  });

  it("stops when a person has a decision to make", () => {
    const s = startGame({ mode: "solo", count: 2, difficulty: "hen", handLimit: null, quick: false, expansion: false });
    // Your turn, game just started: nothing for the bots to do.
    expect(fastForward(s).winner).toBeNull();
    expect(fastForward(s).log).toEqual(s.log);
  });
});
