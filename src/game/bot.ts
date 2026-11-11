// Computer players. botStep looks at the current phase, makes one decision for
// the bot that needs to act, and returns the new state. The UI calls it on a
// timer so each bot move is visible as its own beat.
//
// Three difficulty levels share one decision procedure and differ by profile:
//   chick   — barely looks at the pile, forgets everything, plays at random
//   hen     — peeks, dodges a known chicken, grabs cards when short
//   rooster — remembers the top of the pile, counts Extinguishers, aims
//             chickens at whoever is exposed, saves No Way for what matters

import { PLAIN_KINDS, type Card, type CardKind } from "./cards";
import { discardCards, drawCard, giveFavorCard, passOnNope, placeChicken, playCards, sayNoWay } from "./rules";
import { alivePlayers, currentPlayer, hasCard, nextAlive, playerById, rand, type Difficulty, type GameState, type PendingAction, type Player } from "./state";

// ---------- profiles ----------

interface BotProfile {
  peekChance: number;
  remembers: boolean; // uses botKnowledge at all
  dodgeWhenExposed: number; // no extinguisher and a risky pile
  dangerThreshold: number;
  passAttack: number; // under attack, pass it on
  idleAttack: number;
  grabCards: number; // play Favor / a pair when short on cards
  shortHand: number;
  nopeTargeted: number; // the action is aimed at me
  nopeOther: number;
  placement: "random" | "nearTop" | "cunning";
  givesCheapest: boolean;
}

const PROFILES: Record<Difficulty, BotProfile> = {
  chick: {
    peekChance: 0.2, remembers: false, dodgeWhenExposed: 0.3, dangerThreshold: 0.35, passAttack: 0.3, idleAttack: 0.1,
    grabCards: 0.2, shortHand: 3, nopeTargeted: 0.2, nopeOther: 0.05, placement: "random", givesCheapest: false,
  },
  hen: {
    peekChance: 0.7, remembers: true, dodgeWhenExposed: 0.75, dangerThreshold: 0.2, passAttack: 0.7, idleAttack: 0.25,
    grabCards: 0.5, shortHand: 4, nopeTargeted: 0.6, nopeOther: 0.12, placement: "nearTop", givesCheapest: true,
  },
  rooster: {
    peekChance: 0.9, remembers: true, dodgeWhenExposed: 0.95, dangerThreshold: 0.15, passAttack: 0.9, idleAttack: 0.15,
    grabCards: 0.7, shortHand: 5, nopeTargeted: 0.9, nopeOther: 0.05, placement: "cunning", givesCheapest: true,
  },
};

const profileOf = (s: GameState) => PROFILES[s.difficulty];

// ---------- entry points ----------

/** Which bot needs to act in this phase, or null if it's a person's move (or nobody's). */
export function activeBot(s: GameState): number | null {
  if (s.winner !== null) return null;
  switch (s.phase.type) {
    case "turn":
    case "placeChicken":
    case "discardDown": {
      const p = currentPlayer(s);
      return p.isHuman ? null : p.id;
    }
    case "favorGive": {
      const g = playerById(s, s.phase.giverId);
      return g.isHuman ? null : g.id;
    }
    case "nopeWindow":
      return s.phase.candidates.find((id) => !playerById(s, id).isHuman) ?? null;
    default:
      return null;
  }
}

export function botStep(s: GameState): GameState {
  const id = activeBot(s);
  if (id === null) return s;
  const bot = playerById(s, id);
  const profile = profileOf(s);

  switch (s.phase.type) {
    case "turn":
      return takeTurn(s, bot, profile);
    case "placeChicken":
      return withQuip(placeChicken(s, choosePlacement(s, bot, profile)), bot, "placed");
    case "favorGive":
      return giveFavorCard(s, profile.givesCheapest ? cheapestCard(bot.hand) : bot.hand[rand(bot.hand.length)].id);
    case "discardDown":
      return discardCards(s, [cheapestCard(bot.hand)]);
    case "nopeWindow":
      return decideNoWay(s, s.phase.action, s.phase.candidates, profile);
    default:
      return s;
  }
}

// ---------- a normal turn ----------

function takeTurn(s: GameState, bot: Player, pr: BotProfile): GameState {
  const has = (k: CardKind) => hasCard(bot, k);
  const play = (cards: Card[], targetId: number | undefined, quip: QuipEvent, named?: CardKind) =>
    withQuip(playCards(s, bot.id, cards.map((c) => c.id), targetId, named), bot, quip);
  const danger = s.deck.filter((c) => c.kind === "chicken").length / Math.max(1, s.deck.length);
  const known = pr.remembers ? s.botKnowledge[bot.id] : [];
  const topKnown = known.length > 0 && known[0] !== null;
  const chickenOnTop = known[0] === "chicken";

  // Look before leaping (unless the top is already known).
  const peek = has("peek");
  if (!topKnown && peek && Math.random() < pr.peekChance) return play([peek], undefined, "peeked");

  // A chicken is on top: dodge it. Double Peck is best — the next player draws it.
  if (chickenOnTop) {
    const dodge = has("peck") ?? has("skip") ?? has("reverse") ?? has("careful") ?? has("bottom") ?? has("escape") ?? has("shuffle");
    if (dodge) return play([dodge], undefined, "dodged");
  }

  // Exposed (no extinguisher) and the pile is risky: dodge if possible.
  if (!topKnown && !has("extinguisher") && danger > pr.dangerThreshold) {
    const dodge = has("careful") ?? has("peck") ?? has("skip") ?? has("reverse") ?? has("bottom");
    if (dodge && Math.random() < pr.dodgeWhenExposed) return play([dodge], undefined, "dodged");
  }

  // Pass the pain along, or escape it outright.
  const peck = has("peck");
  if (peck && s.turnsLeft > 1 && Math.random() < pr.passAttack) return play([peck], undefined, "attacked");
  const escape = has("escape");
  if (escape && s.turnsLeft > 1 && Math.random() < pr.passAttack) return play([escape], undefined, "dodged");
  if (peck && !topKnown && Math.random() < pr.idleAttack) return play([peck], undefined, "attacked");

  // Expansion mischief: a weak hand is worth scrambling; a victim with steal cards is worth foxing.
  const scramble = has("scramble");
  if (scramble && !has("extinguisher") && Math.random() < pr.grabCards) return play([scramble], undefined, "grabbed");
  const fox = has("fox");
  if (fox && Math.random() < pr.grabCards * 0.6) {
    const juicy = alivePlayers(s).filter((q) => q.id !== bot.id && q.hand.some((c) => c.kind === "favor" || PLAIN_KINDS.includes(c.kind as never)));
    const victim = juicy.sort((a, b) => b.hand.length - a.hand.length)[0];
    if (victim) return play([fox], victim.id, "attacked");
  }

  // Three of a kind: ask for an Extinguisher when exposed, from whoever most likely still has one.
  const triple = findMatching(bot.hand, 3);
  if (triple && !has("extinguisher") && Math.random() < pr.grabCards) {
    const holder = likelyHolder(s, bot, pr);
    if (holder) return play(triple, holder.id, "grabbed", "extinguisher");
  }

  // Grab cards when short on them.
  if (bot.hand.length <= pr.shortHand && Math.random() < pr.grabCards) {
    const victim = pickVictim(s, bot, pr);
    if (victim) {
      // Holding an Extinguisher already, a triple is still worth a No Way or a Skip.
      if (triple) return play(triple, victim.id, "grabbed", pr.placement === "random" ? ASKABLE[rand(ASKABLE.length)] : "noway");
      const pair = findPair(bot.hand);
      if (pair) return play(pair, victim.id, "grabbed");
      const favor = has("favor");
      if (favor) return play([favor], victim.id, "grabbed");
    }
  }

  return withQuip(drawCard(s), bot, topKnown && !chickenOnTop ? "drewSafe" : "drew");
}

function findPair(hand: Card[]): Card[] | null {
  return findMatching(hand, 2);
}

function findMatching(hand: Card[], n: number): Card[] | null {
  for (const k of PLAIN_KINDS) {
    const matching = hand.filter((c) => c.kind === k);
    if (matching.length >= n) return matching.slice(0, n);
  }
  return null;
}

/** Cards worth naming with three of a kind, for a bot that asks at random. */
const ASKABLE: CardKind[] = ["extinguisher", "noway", "skip", "favor", "peek"];

/**
 * Who most likely still holds an Extinguisher: everyone is dealt one, so prefer players
 * who haven't been seen using theirs, then bigger hands. Chick just picks anyone.
 */
function likelyHolder(s: GameState, bot: Player, pr: BotProfile): Player | null {
  const others = alivePlayers(s).filter((p) => p.id !== bot.id && p.hand.length > 0);
  if (pr.placement === "random") return others[rand(others.length)] ?? null;
  const score = (p: Player) => p.hand.length - 5 * (s.extinguishersUsed[p.id] ?? 0);
  return others.sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Chick picks anyone; Hen goes after the fattest hand; Rooster also prefers whoever has used up an Extinguisher. */
function pickVictim(s: GameState, bot: Player, pr: BotProfile): Player | null {
  const others = alivePlayers(s).filter((p) => p.id !== bot.id && p.hand.length > 0);
  if (pr.placement === "random") return others[rand(others.length)] ?? null;
  const score = (p: Player) => p.hand.length + (pr.placement === "cunning" && s.extinguishersUsed[p.id] > 0 ? 3 : 0);
  return others.sort((a, b) => score(b) - score(a))[0] ?? null;
}

// ---------- other decisions ----------

/** A player who has used an Extinguisher, or holds almost nothing, is probably defenceless. */
function looksExposed(s: GameState, p: Player): boolean {
  return s.extinguishersUsed[p.id] > 0 || p.hand.length <= 2;
}

function choosePlacement(s: GameState, bot: Player, pr: BotProfile): number {
  const spots = s.deck.length + 1;
  if (pr.placement === "random") return rand(spots);
  if (pr.placement === "nearTop") return Math.random() < 0.6 ? rand(Math.min(3, spots)) : rand(spots);
  // Cunning: the chicken must come out before the bot's own next turn. On top if the next
  // player looks exposed, otherwise somewhere in the stretch the other players will draw from.
  const next = nextAlive(s, s.players.indexOf(bot));
  if (looksExposed(s, next)) return 0;
  const othersDrawing = Math.max(1, alivePlayers(s).length - 1 + s.pendingAttack);
  return rand(Math.min(spots, othersDrawing));
}

/** Least valuable card first, so Favors and discards cost bots as little as possible. */
const GIVE_PRIORITY: CardKind[] = ["egg", "chick", "hen", "rooster", "shuffle", "scramble", "bottom", "peek", "favor", "fox", "reverse", "skip", "careful", "peck", "escape", "noway", "hot", "extinguisher", "chicken"];

function cheapestCard(hand: Card[]): number {
  for (const k of GIVE_PRIORITY) {
    const c = hand.find((x) => x.kind === k);
    if (c) return c.id;
  }
  return hand[0].id;
}

/** Every bot candidate decides at once; the first one to object cancels the action. */
function decideNoWay(s: GameState, action: PendingAction, candidates: number[], pr: BotProfile): GameState {
  const bots = candidates.map((id) => playerById(s, id)).filter((p) => !p.isHuman);
  for (const bot of bots) {
    const aimedAtMe = action.targetId === bot.id || (action.kind === "peck" && nextAlive(s, s.current).id === bot.id);
    // Rooster protects what it knows: a Shuffle would wipe its map of the pile.
    const knowledgeThreatened = pr.placement === "cunning" && action.kind === "shuffle" && s.botKnowledge[bot.id].length > 0;
    const chance = aimedAtMe ? pr.nopeTargeted : knowledgeThreatened ? 0.5 : pr.nopeOther;
    if (Math.random() < chance) return withQuip(sayNoWay(s, bot.id), bot, "noped");
  }
  return passOnNope(s, bots.map((b) => b.id));
}

// ---------- personality ----------

type QuipEvent = "peeked" | "dodged" | "attacked" | "grabbed" | "drew" | "drewSafe" | "placed" | "noped";

const VOICES: Record<string, Partial<Record<QuipEvent, string[]>>> = {
  Wingston: {
    peeked: ["Hmm, let’s have a gander.", "Curiosity never killed a chicken."],
    dodged: ["Not with these feathers.", "Sidestep!"],
    attacked: ["Catch!", "Yours, I believe."],
    grabbed: ["Ooh, shiny.", "Finders keepers."],
    drew: ["Fortune favours the plump.", "Ta-da?"],
    drewSafe: ["Told you.", "Smooth."],
    placed: ["Hidden with love.", "Somewhere cosy."],
    noped: ["Veto.", "I think not."],
  },
  Henrietta: {
    peeked: ["A lady likes to know.", "Peeking is not cheating."],
    dodged: ["Excuse me, no.", "I’ll pass, dear."],
    attacked: ["Do be careful.", "A gift for you."],
    grabbed: ["Thank you kindly.", "Lovely, I’ll keep this."],
    drew: ["Deep breath.", "Let’s see."],
    drewSafe: ["As expected.", "Mm-hm."],
    placed: ["Tucked away.", "Nobody saw that."],
    noped: ["Absolutely not.", "No, thank you."],
  },
  Nugget: {
    peeked: ["Just a tiny look…", "Please be safe, please be safe."],
    dodged: ["Nope nope nope.", "Not today!"],
    attacked: ["Sorry! Sorry!", "You take it, I can’t."],
    grabbed: ["Can I borrow this?", "I need that more than you."],
    drew: ["Here goes nothing.", "Eep."],
    drewSafe: ["Phew.", "I knew that one was fine."],
    placed: ["I put it… somewhere.", "Good luck everyone!"],
    noped: ["No! Sorry! No!", "I panicked."],
  },
  Drumstick: {
    peeked: ["Let me see what’s cooking.", "Scouting ahead."],
    dodged: ["Too easy.", "Not falling for that."],
    attacked: ["Enjoy your two turns.", "Your problem now."],
    grabbed: ["I’ll be taking that.", "Mine."],
    drew: ["Watch and learn.", "Easy."],
    drewSafe: ["Called it.", "Like I said. Easy."],
    placed: ["Hidden it well.", "Try not to find it."],
    noped: ["Nah.", "Denied."],
  },
  Colonel: {
    peeked: ["Reconnaissance.", "Know your enemy."],
    dodged: ["Tactical retreat.", "Discipline, soldier."],
    attacked: ["Hold the line, private.", "Your turn in the trenches."],
    grabbed: ["Requisitioned.", "For the war effort."],
    drew: ["Steady.", "Into the breach."],
    drewSafe: ["As planned.", "Intelligence pays."],
    placed: ["Mines laid.", "Watch your step."],
    noped: ["Overruled.", "Permission denied."],
  },
};

const QUIP_CHANCE = 0.55;

function withQuip(s: GameState, bot: Player, event: QuipEvent): GameState {
  if (Math.random() > QUIP_CHANCE) return s;
  const lines = VOICES[bot.name]?.[event];
  if (!lines) return s;
  return { ...s, quip: { id: s.nextId, playerId: bot.id, text: lines[rand(lines.length)] }, nextId: s.nextId + 1 };
}
