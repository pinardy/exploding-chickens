// Fuzz the engine: random legal play for hundreds of games, checking invariants after every step.
import { describe, expect, it } from "vitest";
import {
  activeBot, activeHuman, botStep, canPlay, discardCards, dismissPeek, drawCard, giveFavorCard, letItHappen,
  placeChicken, playCards, playerById, sayNoWay, startGame, HAND_LIMIT, type CardKind, type GameSetup, type GameState,
} from "./index";

const NAMEABLE: CardKind[] = ["extinguisher", "noway", "skip", "favor", "hen", "hot"];

function randomHumanMove(s: GameState, id: number): GameState {
  const me = playerById(s, id);
  if (s.phase.type === "peek") return dismissPeek(s);
  if (s.phase.type === "placeChicken") return placeChicken(s, Math.floor(Math.random() * (s.deck.length + 1)));
  if (s.phase.type === "favorGive") return giveFavorCard(s, me.hand[0].id);
  if (s.phase.type === "discardDown") return discardCards(s, me.hand.slice(0, s.phase.count).map((c) => c.id));
  if (s.phase.type !== "turn") throw new Error(`unexpected phase ${s.phase.type}`);
  const target = s.players.find((p) => p.alive && p.id !== id)?.id;
  if (Math.random() < 0.4) {
    // Three of a kind, naming a random card.
    for (const c of me.hand) {
      const same = me.hand.filter((d) => d.kind === c.kind).map((d) => d.id).slice(0, 3);
      if (same.length === 3 && canPlay(s, id, same) === "triple") return playCards(s, id, same, target, NAMEABLE[Math.floor(Math.random() * NAMEABLE.length)]);
    }
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

describe("three of a kind", () => {
  it("takes the named card when the target has one, and nothing otherwise", () => {
    const base = startGame({ mode: "solo", count: 1, difficulty: "chick", handLimit: null, quick: false, expansion: false });
    const [me, bot] = base.players;
    const hens = [900, 901, 902].map((id) => ({ id, kind: "hen" as const }));
    me.hand = [...hens];
    bot.hand = [{ id: 950, kind: "noway" }, { id: 951, kind: "skip" }];

    expect(canPlay(base, me.id, hens.map((c) => c.id))).toBe("triple");
    // Needs a named card.
    expect(playCards(base, me.id, hens.map((c) => c.id), bot.id)).toEqual(base);

    // Asking for a Skip: the bot's No Way window opens first; let it pass.
    let s = playCards(base, me.id, hens.map((c) => c.id), bot.id, "skip");
    if (s.phase.type === "nopeWindow") s = letItHappen(s);
    expect(s.players[0].hand.map((c) => c.kind)).toEqual(["skip"]);
    expect(s.players[1].hand.map((c) => c.kind)).toEqual(["noway"]);
    expect(s.discard.slice(-3).map((c) => c.kind)).toEqual(["hen", "hen", "hen"]);

    // Asking for something they don't have: nothing moves.
    s = playCards(base, me.id, hens.map((c) => c.id), bot.id, "extinguisher");
    if (s.phase.type === "nopeWindow") s = letItHappen(s);
    expect(s.players[0].hand).toEqual([]);
    expect(s.players[1].hand).toHaveLength(2);
    expect(s.log[s.log.length - 1]?.text).toMatch(/doesn't have an Extinguisher/);
  });

  it("rejects three cards that don't match", () => {
    const s = startGame({ mode: "solo", count: 1, difficulty: "chick", handLimit: null, quick: false, expansion: false });
    s.players[0].hand = [{ id: 900, kind: "hen" }, { id: 901, kind: "hen" }, { id: 902, kind: "egg" }];
    expect(canPlay(s, 0, [900, 901, 902])).toEqual({ error: "Three cards only work as matching chickens." });
  });
});
