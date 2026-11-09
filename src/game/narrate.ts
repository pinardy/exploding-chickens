// Everything the game log says. Rules call these instead of building strings inline.
// In solo mode the human is "you" and may be told their own cards; in pass & play
// everyone is named and cards stay unnamed, since the next person will read the log.

import { cardName, type Card } from "./cards";
import { isYou, log, type GameState, type PendingAction, type Player } from "./state";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "You" / "Nugget", and the matching verb form: who(s, p, "win", "wins"). */
function who(s: GameState, p: Player, youVerb: string, nameVerb: string) {
  return isYou(s, p) ? `You ${youVerb}` : `${p.name} ${nameVerb}`;
}

export function actionLabel(a: PendingAction): string {
  return a.kind === "pair" ? `a pair of ${cardName(a.cards[0])}s` : cardName(a.cards[0]);
}

export const narrate = {
  intro(s: GameState) {
    const n = s.players.length;
    log(s, `${n} players, ${n - 1} exploding chickens in the pile. ${who(s, s.players[0], "go", "goes")} first.`);
  },

  turnStart(s: GameState, p: Player) {
    const base = isYou(s, p) ? "Your turn" : `${p.name}'s turn`;
    log(s, s.turnsLeft > 1 ? `${base} — ${s.turnsLeft} turns to take.` : `${base}.`);
  },

  turnsLeft(s: GameState, p: Player) {
    log(s, `${who(s, p, "have", "has")} ${plural(s.turnsLeft, "turn")} left.`);
  },

  winner(s: GameState, p: Player) {
    log(s, `${who(s, p, "win", "wins")} — last chicken standing!`, "good");
  },

  drew(s: GameState, p: Player, card: Card) {
    log(s, isYou(s, p) ? `You drew ${cardName(card)}.` : `${p.name} drew a card.`);
  },

  defused(s: GameState, p: Player) {
    log(s, `${p.name} drew an Exploding Chicken and put it out with an Extinguisher!`, "good");
  },

  placedChicken(s: GameState, p: Player, depth: number) {
    if (!isYou(s, p)) log(s, `${p.name} slipped the chicken back into the pile.`);
    else if (depth === 0) log(s, "You put the chicken right on top. Bold.");
    else log(s, `You slipped the chicken ${plural(depth, "card")} down.`);
  },

  exploded(s: GameState, p: Player) {
    log(s, `${p.name} drew an Exploding Chicken with no Extinguisher. ${isYou(s, p) ? "You're" : "They're"} out!`, "bad");
  },

  played(s: GameState, p: Player, a: PendingAction, target: Player | null) {
    log(s, `${p.name} played ${actionLabel(a)}${target ? ` on ${isYou(s, target) ? "you" : target.name}` : ""}.`);
  },

  noWay(s: GameState, h: Player, actor: Player) {
    log(s, `${who(s, h, "say", "says")} No Way! ${actor.name}'s card fizzles.`, isYou(s, actor) ? "bad" : "good");
  },

  skipped(s: GameState, p: Player) {
    log(s, `${who(s, p, "skip", "skips")} drawing.`);
  },

  reversed(s: GameState, p: Player) {
    log(s, `${who(s, p, "skip", "skips")} drawing and the turn order flips.`);
  },

  escaped(s: GameState, p: Player, turns: number) {
    log(s, `${who(s, p, "escape", "escapes")} ${turns > 1 ? `all ${turns} turns` : "the turn"} without drawing.`);
  },

  drewFromBottom(s: GameState, p: Player) {
    log(s, `${who(s, p, "draw", "draws")} from the bottom of the pile…`);
  },

  carefulPeck(s: GameState, p: Player, found: boolean) {
    log(s, found ? `${who(s, p, "peck", "pecks")} carefully past the chickens…` : `${who(s, p, "find", "finds")} nothing but chickens and ${isYou(s, p) ? "skip" : "skips"} instead.`);
  },

  foxed(s: GameState, target: Player, count: number) {
    log(s, count === 0 ? `${target.name} had nothing for the fox to eat.` : `The fox eats ${plural(count, "card")} from ${isYou(s, target) ? "your" : `${target.name}'s`} hand!`, isYou(s, target) ? "bad" : "normal");
  },

  scrambled(s: GameState) {
    log(s, "Every hand is pooled, shuffled and dealt back out.");
  },

  tossed(s: GameState, from: Player, to: Player) {
    log(s, `${from.name} drew an Exploding Chicken and tossed it to ${isYou(s, to) ? "you" : to.name}!`, isYou(s, to) ? "bad" : "normal");
  },

  pecked(s: GameState, p: Player, victim: Player, turns: number) {
    log(s, `${p.name} pecks ${isYou(s, victim) ? "you" : victim.name}: ${turns} turns coming up.`, isYou(s, victim) ? "bad" : "normal");
  },

  shuffled(s: GameState) {
    log(s, "The pile is shuffled.");
  },

  botPeeked(s: GameState, p: Player, sawChicken: boolean) {
    log(s, `${p.name} peeks at the pile and looks ${sawChicken ? "worried" : "relieved"}.`);
  },

  nothingToTake(s: GameState, target: Player, verb: "give" | "steal") {
    log(s, `${target.name} has nothing to ${verb}.`);
  },

  handedOver(s: GameState, giver: Player, to: Player, card: Card) {
    if (isYou(s, to)) log(s, `${giver.name} hands you ${cardName(card)}.`);
    else if (isYou(s, giver)) log(s, `You hand ${cardName(card)} to ${to.name}.`);
    else log(s, `${giver.name} hands a card to ${to.name}.`);
  },

  overLimit(s: GameState, p: Player, count: number) {
    log(s, `${who(s, p, "are", "is")} over the hand limit and must discard ${plural(count, "card")}.`);
  },

  discarded(s: GameState, p: Player, cards: Card[]) {
    log(s, isYou(s, p) ? `You discard ${cards.map(cardName).join(" and ")}.` : `${p.name} discards ${plural(cards.length, "card")}.`);
  },

  stole(s: GameState, thief: Player, victim: Player, card: Card) {
    if (isYou(s, thief)) log(s, `You steal ${cardName(card)} from ${victim.name}.`);
    else if (isYou(s, victim)) log(s, `${thief.name} steals your ${cardName(card)}!`, "bad");
    else log(s, `${thief.name} steals a card from ${victim.name}.`);
  },
};

