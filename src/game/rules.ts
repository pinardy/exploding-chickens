// The rules. Every exported function takes a state and returns a new one; the
// input is never mutated. Choices that belong to a player (where to put the
// chicken back, which card to hand over, whether to say No Way) are exposed as
// phases, so humans and bots use the same entry points.

import { isPlain, type Card, type PlayKind } from "./cards";
import { narrate } from "./narrate";
import {
  alivePlayers,
  cue,
  currentPlayer,
  forgetPileOrder,
  hasCard,
  isYou,
  nextAlive,
  pileTopDrawn,
  playerById,
  rand,
  setEvent,
  shuffleArray,
  takeFromHand,
  newGame,
  type Player,
  type GameSetup,
  type GameState,
  type PendingAction,
} from "./state";

export function startGame(setup: GameSetup): GameState {
  const s = newGame(setup);
  narrate.intro(s);
  return s;
}

// ---------- turn flow (internal) ----------

function advanceTurn(s: GameState) {
  if (s.winner !== null) return;
  const next = nextAlive(s, s.current);
  s.current = s.players.indexOf(next);
  s.turnsLeft = s.pendingAttack > 0 ? s.pendingAttack : 1;
  s.pendingAttack = 0;
  s.phase = { type: "turn" };
  narrate.turnStart(s, next);
}

function finishOneTurn(s: GameState) {
  s.turnsLeft -= 1;
  if (s.turnsLeft <= 0) {
    advanceTurn(s);
  } else {
    s.phase = { type: "turn" };
    narrate.turnsLeft(s, currentPlayer(s));
  }
}

function checkWinner(s: GameState) {
  const alive = alivePlayers(s);
  if (alive.length !== 1) return;
  s.winner = alive[0].id;
  s.current = s.players.indexOf(alive[0]);
  s.phase = { type: "gameOver" };
  narrate.winner(s, alive[0]);
}

// ---------- drawing ----------

export function drawCard(state: GameState): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "turn") return s;
  const card = s.deck.shift();
  if (!card) return s; // can't happen: chickens keep the pile from emptying
  pileTopDrawn(s);
  receiveDraw(s, currentPlayer(s), card);
  return s;
}

/** A drawn card arrives in the current player's hand, or it's a chicken and the trouble starts. */
function receiveDraw(s: GameState, p: Player, card: Card) {
  if (card.kind === "chicken") {
    faceChicken(s, p, card);
    return;
  }
  p.hand.push(card);
  cue(s, "draw");
  narrate.drew(s, p, card);
  const over = s.handLimit === null ? 0 : p.hand.length - s.handLimit;
  if (over > 0) {
    narrate.overLimit(s, p, over);
    s.phase = { type: "discardDown", count: over };
  } else {
    finishOneTurn(s);
  }
}

/** Hot Chicken tosses it on, an Extinguisher puts it out, otherwise boom. */
function faceChicken(s: GameState, p: Player, card: Card, tossed = false) {
  const hot = hasCard(p, "hot");
  if (hot) {
    s.discard.push(...takeFromHand(p, [hot.id]));
    cue(s, "peck");
    s.turnsLeft = 0;
    advanceTurn(s);
    const next = currentPlayer(s);
    narrate.tossed(s, p, next);
    faceChicken(s, next, card, true);
    return;
  }

  const extinguisher = hasCard(p, "extinguisher");
  if (extinguisher) {
    s.discard.push(...takeFromHand(p, [extinguisher.id]));
    s.extinguishersUsed[p.id] += 1;
    setEvent(s, "defuse", p.id);
    cue(s, "defuse");
    narrate.defused(s, p);
    s.phase = { type: "placeChicken", card, turnContinues: tossed };
    return;
  }

  s.discard.push(card, ...p.hand);
  p.hand = [];
  p.alive = false;
  setEvent(s, "explode", p.id);
  cue(s, "boom");
  narrate.exploded(s, p);
  checkWinner(s);
  if (s.winner === null) {
    s.pendingAttack = 0;
    advanceTurn(s);
  }
}

/** Put a defused chicken back; `depth` 0 is the top of the pile. */
export function placeChicken(state: GameState, depth: number): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "placeChicken") return s;
  const idx = Math.max(0, Math.min(s.deck.length, depth));
  const p = currentPlayer(s);
  const mine = s.botKnowledge[p.id];
  s.deck.splice(idx, 0, s.phase.card);
  forgetPileOrder(s);
  if (mine) {
    // The bot that put it back knows exactly where it is; nobody else does.
    const known = mine.slice();
    while (known.length < idx) known.push(null);
    known.splice(idx, 0, "chicken");
    s.botKnowledge[p.id] = known;
  }
  cue(s, "pop");
  narrate.placedChicken(s, p, idx);
  if (s.phase.turnContinues) s.phase = { type: "turn" };
  else finishOneTurn(s);
  return s;
}

/** Discard cards to get back under the hand limit. */
export function discardCards(state: GameState, cardIds: number[]): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "discardDown" || cardIds.length === 0) return s;
  const p = currentPlayer(s);
  const cards = takeFromHand(p, cardIds.slice(0, s.phase.count));
  s.discard.push(...cards);
  cue(s, "pop");
  narrate.discarded(s, p, cards);
  const left = s.phase.count - cards.length;
  if (left > 0) s.phase = { type: "discardDown", count: left };
  else finishOneTurn(s);
  return s;
}

// ---------- playing cards ----------

export interface PlayError {
  error: string;
}

/** What playing these cards would do, or why it can't be done. */
export function canPlay(s: GameState, playerId: number, cardIds: number[]): PlayKind | PlayError {
  if (s.phase.type !== "turn") return { error: "Not now." };
  const p = currentPlayer(s);
  if (p.id !== playerId) return { error: "It isn't your turn." };
  const cards = cardIds.map((id) => p.hand.find((c) => c.id === id)).filter((c): c is Card => !!c);
  if (cards.length !== cardIds.length) return { error: "Card not in hand." };
  if (cards.length === 2) {
    if (isPlain(cards[0].kind) && cards[0].kind === cards[1].kind) return "pair";
    return { error: "Two cards only work as matching chickens." };
  }
  if (cards.length !== 1) return { error: "Play one action card, or two matching chickens." };
  switch (cards[0].kind) {
    case "noway":
      return { error: "No Way only cancels someone else's action." };
    case "extinguisher":
      return { error: "Extinguishers are used automatically when you draw a chicken." };
    case "chicken":
      return { error: "You can't play that." };
    case "hot":
      return { error: "Hot Chicken works on its own when you draw a chicken." };
    case "hen":
    case "rooster":
    case "chick":
    case "egg":
      return { error: "Plain chickens only work as a pair." };
    default:
      return cards[0].kind;
  }
}

/**
 * Play cards. If anyone else holds No Way the game pauses in a nopeWindow until
 * they all decide (bots via botStep, people via sayNoWay / passOnNope); otherwise
 * the action resolves immediately.
 */
export function playCards(state: GameState, playerId: number, cardIds: number[], targetId?: number): GameState {
  const s = structuredClone(state);
  const kind = canPlay(s, playerId, cardIds);
  if (typeof kind !== "string") return s;
  const p = currentPlayer(s);
  const cards = takeFromHand(p, cardIds);
  s.discard.push(...cards);
  cue(s, kind === "pair" ? "cluck" : "pop");

  const action: PendingAction = { actorId: p.id, kind, cards, targetId };
  narrate.played(s, p, action, targetId !== undefined ? playerById(s, targetId) : null);

  const candidates = alivePlayers(s)
    .filter((o) => o.id !== p.id && hasCard(o, "noway"))
    .map((o) => o.id);
  if (candidates.length > 0) {
    s.phase = { type: "nopeWindow", action, candidates };
  } else {
    resolveAction(s, action);
  }
  return s;
}

/** A candidate plays No Way: the pending action is cancelled and the actor's turn continues. */
export function sayNoWay(state: GameState, playerId: number): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "nopeWindow" || !s.phase.candidates.includes(playerId)) return s;
  const h = playerById(s, playerId);
  const card = hasCard(h, "noway");
  if (!card) return s;
  s.discard.push(...takeFromHand(h, [card.id]));
  cue(s, "buzz");
  narrate.noWay(s, h, playerById(s, s.phase.action.actorId));
  s.phase = { type: "turn" };
  return s;
}

/** Some candidates decline to cancel. When nobody is left to decide, the action resolves. */
export function passOnNope(state: GameState, playerIds: number[]): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "nopeWindow") return s;
  const remaining = s.phase.candidates.filter((id) => !playerIds.includes(id));
  if (remaining.length > 0) {
    s.phase = { ...s.phase, candidates: remaining };
  } else {
    const { action } = s.phase;
    s.phase = { type: "turn" };
    resolveAction(s, action);
  }
  return s;
}

/** Everyone still deciding lets it happen (the window timed out). */
export function letItHappen(state: GameState): GameState {
  return state.phase.type === "nopeWindow" ? passOnNope(state, state.phase.candidates) : state;
}

function resolveAction(s: GameState, a: PendingAction) {
  const p = playerById(s, a.actorId);
  switch (a.kind) {
    case "skip":
      narrate.skipped(s, p);
      finishOneTurn(s);
      return;

    case "peck": {
      const turns = s.turnsLeft > 1 ? s.turnsLeft + 2 : 2;
      s.pendingAttack = turns;
      s.turnsLeft = 0;
      cue(s, "peck");
      narrate.pecked(s, p, nextAlive(s, s.current), turns);
      advanceTurn(s);
      return;
    }

    case "reverse":
      s.direction = s.direction === 1 ? -1 : 1;
      narrate.reversed(s, p);
      finishOneTurn(s);
      return;

    case "escape":
      narrate.escaped(s, p, s.turnsLeft);
      s.turnsLeft = 0;
      advanceTurn(s);
      return;

    case "bottom": {
      const card = s.deck.pop()!;
      // Positions from the top don't move, but anything known about the old bottom card is gone.
      for (const k of Object.keys(s.botKnowledge)) {
        const known = s.botKnowledge[Number(k)];
        if (known.length > s.deck.length) known.length = s.deck.length;
      }
      narrate.drewFromBottom(s, p);
      receiveDraw(s, p, card);
      return;
    }

    case "careful": {
      const idx = s.deck.findIndex((c) => c.kind !== "chicken");
      narrate.carefulPeck(s, p, idx !== -1);
      if (idx === -1) {
        finishOneTurn(s);
        return;
      }
      const [card] = s.deck.splice(idx, 1);
      for (const k of Object.keys(s.botKnowledge)) s.botKnowledge[Number(k)].splice(idx, 1);
      receiveDraw(s, p, card);
      return;
    }

    case "fox": {
      const t = playerById(s, a.targetId!);
      const eaten = t.hand.filter((c) => c.kind === "favor" || isPlain(c.kind));
      s.discard.push(...takeFromHand(t, eaten.map((c) => c.id)));
      cue(s, "cluck");
      narrate.foxed(s, t, eaten.length);
      return;
    }

    case "scramble": {
      const alive = alivePlayers(s);
      const pool = shuffleArray(alive.flatMap((q) => q.hand));
      for (const q of alive) q.hand = pool.splice(0, q.hand.length);
      cue(s, "shuffle");
      narrate.scrambled(s);
      return;
    }

    case "shuffle":
      s.deck = shuffleArray(s.deck);
      forgetPileOrder(s);
      cue(s, "shuffle");
      narrate.shuffled(s);
      return;

    case "peek": {
      const top = s.deck.slice(0, 3);
      cue(s, "peek");
      if (p.isHuman) {
        s.phase = { type: "peek", cards: top };
      } else {
        s.botKnowledge[p.id] = top.map((c) => c.kind);
        narrate.botPeeked(s, p, top[0]?.kind === "chicken");
      }
      return;
    }

    case "favor": {
      const t = playerById(s, a.targetId!);
      if (!t.alive || t.hand.length === 0) narrate.nothingToTake(s, t, "give");
      else s.phase = { type: "favorGive", giverId: t.id, toId: p.id };
      return;
    }

    case "pair": {
      const t = playerById(s, a.targetId!);
      if (!t.alive || t.hand.length === 0) {
        narrate.nothingToTake(s, t, "steal");
        return;
      }
      const stolen = t.hand.splice(rand(t.hand.length), 1)[0];
      p.hand.push(stolen);
      cue(s, "cluck");
      narrate.stole(s, p, t, stolen);
      return;
    }
  }
}

export function dismissPeek(state: GameState): GameState {
  if (state.phase.type !== "peek") return state;
  return { ...state, phase: { type: "turn" } };
}

export function giveFavorCard(state: GameState, cardId: number): GameState {
  const s = structuredClone(state);
  if (s.phase.type !== "favorGive") return s;
  const giver = playerById(s, s.phase.giverId);
  const to = playerById(s, s.phase.toId);
  const [card] = takeFromHand(giver, [cardId]);
  to.hand.push(card);
  cue(s, "cluck");
  narrate.handedOver(s, giver, to, card);
  s.phase = { type: "turn" };
  return s;
}

export function clearQuip(state: GameState): GameState {
  return state.quip ? { ...state, quip: null } : state;
}

export function clearEvent(state: GameState): GameState {
  return state.event ? { ...state, event: null } : state;
}

// ---------- who acts next ----------

/** The person who must act now (and should be holding the phone), or null. */
export function activeHuman(s: GameState): number | null {
  if (s.winner !== null) return null;
  const actor = s.phase.type === "favorGive" ? playerById(s, s.phase.giverId) : currentPlayer(s);
  return actor.isHuman ? actor.id : null;
}

/** Whether `p` is the human currently allowed to play cards or draw. */
export function isTurnOf(s: GameState, playerId: number): boolean {
  return s.phase.type === "turn" && currentPlayer(s).id === playerId && playerById(s, playerId).alive;
}

export { isYou };
