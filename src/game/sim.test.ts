// Fuzz the engine: random legal play for hundreds of games, checking invariants after every step.
import { describe, expect, it } from "vitest";
import {
  activeBot, activeHuman, botStep, canPlay, discardCards, dismissPeek, drawCard, giveFavorCard, letItHappen,
  placeChicken, playCards, playerById, sayNoWay, startGame, HAND_LIMIT, type GameSetup, type GameState,
} from "./index";

function randomHumanMove(s: GameState, id: number): GameState {
  const me = playerById(s, id);
  if (s.phase.type === "peek") return dismissPeek(s);
  if (s.phase.type === "placeChicken") return placeChicken(s, Math.floor(Math.random() * (s.deck.length + 1)));
  if (s.phase.type === "favorGive") return giveFavorCard(s, me.hand[0].id);
  if (s.phase.type === "discardDown") return discardCards(s, me.hand.slice(0, s.phase.count).map((c) => c.id));
  if (s.phase.type !== "turn") throw new Error(`unexpected phase ${s.phase.type}`);
  const target = s.players.find((p) => p.alive && p.id !== id)?.id;
  if (Math.random() < 0.4) {
    for (const c of me.hand) if (typeof canPlay(s, id, [c.id]) === "string") return playCards(s, id, [c.id], target);
    for (const c of me.hand) for (const d of me.hand) {
      if (c.id !== d.id && typeof canPlay(s, id, [c.id, d.id]) === "string") return playCards(s, id, [c.id, d.id], target);
    }
  }
  return drawCard(s);
}

function step(s: GameState): GameState {
  if (s.phase.type === "nopeWindow") {
    if (activeBot(s) !== null) return botStep(s);
    const human = s.phase.candidates[0];
    return Math.random() < 0.5 ? sayNoWay(s, human) : letItHappen(s);
  }
  const bot = activeBot(s);
  if (bot !== null) return botStep(s);
  const h = activeHuman(s);
  if (h === null) throw new Error("nobody can act");
  return randomHumanMove(s, h);
}

function cardCount(s: GameState) {
  return (s.phase.type === "placeChicken" ? 1 : 0) + s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length, 0);
}

const SETUPS: GameSetup[] = [
  { mode: "solo", count: 1, difficulty: "chick", handLimit: null, quick: false, expansion: false },
  { mode: "solo", count: 3, difficulty: "hen", handLimit: null, quick: false, expansion: true },
  { mode: "solo", count: 3, difficulty: "rooster", handLimit: HAND_LIMIT, quick: false, expansion: true },
  { mode: "solo", count: 5, difficulty: "rooster", handLimit: null, quick: false, expansion: true },
  { mode: "solo", count: 2, difficulty: "rooster", handLimit: HAND_LIMIT, quick: true, expansion: true },
  { mode: "hotseat", count: 2, difficulty: "hen", handLimit: null, quick: true, expansion: false },
  { mode: "hotseat", count: 6, difficulty: "hen", handLimit: HAND_LIMIT, quick: false, expansion: true },
];

describe("engine fuzz", () => {
  for (const setup of SETUPS) {
    it(`finishes cleanly: ${setup.mode} x${setup.count} ${setup.difficulty}${setup.quick ? " quick" : ""}${setup.handLimit ? " limit" : ""}${setup.expansion ? " expansion" : ""}`, () => {
      for (let g = 0; g < 100; g++) {
        let s = startGame(setup);
        const expected = cardCount(s);
        let n = 0;
        while (s.winner === null) {
          const before = JSON.stringify(s);
          s = step(s);
          expect(cardCount(s)).toBe(expected);
          expect(s.players[s.current].alive).toBe(true);
          expect(JSON.stringify(s)).not.toBe(before);
          expect(++n).toBeLessThan(5000);
          // What anyone "knows" about the pile must be true: people now see it on screen.
          for (const [id, known] of Object.entries(s.botKnowledge)) {
            known.forEach((k, i) => {
              if (k !== null) expect(s.deck[i]?.kind, `player ${id} slot ${i}`).toBe(k);
            });
          }
        }
        expect(s.phase.type).toBe("gameOver");
        // Everyone but the winner went out exactly once; the first player took at least one turn.
        expect(s.outOrder).toHaveLength(s.players.length - 1);
        expect(new Set(s.outOrder).size).toBe(s.players.length - 1);
        expect(s.outOrder).not.toContain(s.winner);
        expect(s.turnsTaken[s.players[0].id]).toBeGreaterThanOrEqual(1);
      }
    });
  }
});
