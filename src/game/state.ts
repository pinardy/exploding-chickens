// Game state: types, construction, and small helpers shared by rules.ts and bot.ts.
// Nothing here changes the state after construction; that's rules.ts's job.

import { BASE_EXTRAS, DECK_RECIPE, EXPANSION_RECIPE, PLAIN_KINDS, QUICK_DECK_RECIPE, type Card, type CardKind, type PlayKind } from "./cards";

export type Mode = "solo" | "hotseat";
export type Difficulty = "chick" | "hen" | "rooster";

export interface Seat {
  name: string;
  avatar: string;
}

export interface GameSetup {
  mode: Mode;
  /** solo: number of bots (1-5). hotseat: number of people sharing the device (2-6). */
  count: number;
  /** hotseat only: who's playing. Defaults to Player 1… with default avatars. */
  seats?: Seat[];
  /** How clever the bots are (solo only). */
  difficulty: Difficulty;
  /** Discard down to this many cards after drawing over it. Off when null. */
  handLimit: number | null;
  /** Smaller deck and hands for a five-minute game. */
  quick: boolean;
  /** Mix in the expansion cards. */
  expansion: boolean;
}

export const MAX_PLAYERS = 6;

export const HAND_LIMIT = 8;

export interface Player {
  id: number;
  name: string;
  avatar: string;
  isHuman: boolean;
  hand: Card[];
  alive: boolean;
}

export interface PendingAction {
  actorId: number;
  kind: PlayKind;
  cards: Card[];
  targetId?: number;
}

export type Phase =
  | { type: "turn" }
  /** A card was played; `candidates` hold No Way and haven't decided yet. */
  | { type: "nopeWindow"; action: PendingAction; candidates: number[] }
  | { type: "peek"; cards: Card[] }
  /** `turnContinues` when the chicken was tossed to this player: they place it and then take their turn. */
  | { type: "placeChicken"; card: Card; turnContinues: boolean }
  | { type: "favorGive"; giverId: number; toId: number }
  /** Over the hand limit: the current player must discard `count` cards. */
  | { type: "discardDown"; count: number }
  | { type: "gameOver" };

export interface LogEntry {
  id: number;
  text: string;
  /** "turn" marks whose turn it now is; the UI shows it as a divider rather than a line. */
  tone: "normal" | "bad" | "good" | "turn";
}

/** The cards most recently played (or used to say No Way), so the UI can show where they came from. */
export interface LastPlay {
  id: number;
  actorId: number;
  cardIds: number[];
  targetId?: number;
}

export interface GameEvent {
  id: number;
  type: "explode" | "defuse";
  playerId: number;
}

/** Sound cues the engine can raise. sounds.ts decides what they sound like. */
export type SfxName = "pop" | "draw" | "cluck" | "peck" | "shuffle" | "peek" | "boom" | "defuse" | "buzz" | "fanfare" | "pass";

/** A line a bot says, shown in a speech bubble. Fresh id each time. */
export interface Quip {
  id: number;
  playerId: number;
  text: string;
}

export interface GameState {
  mode: Mode;
  difficulty: Difficulty;
  handLimit: number | null;
  expansion: boolean;
  players: Player[];
  /** Turn order: 1 clockwise through the player list, -1 reversed. */
  direction: 1 | -1;
  deck: Card[]; // index 0 is the top
  discard: Card[]; // last element is the top
  current: number; // index into players
  turnsLeft: number;
  pendingAttack: number; // turns the next player must take, set by Double Peck
  phase: Phase;
  log: LogEntry[];
  /** Something worth a full-screen moment. The UI clears it after showing it. */
  event: GameEvent | null;
  /** Last sound cue, with a fresh id each time so the UI plays it exactly once. */
  sfx: { id: number; name: SfxName } | null;
  /**
   * What each player knows about the top of the pile, top-down, from Peeks and their own chicken
   * placement. null = unknown slot. (Named for the bots, which act on it; people see theirs on screen.)
   */
  botKnowledge: Record<number, (CardKind | null)[]>;
  /** How many Extinguishers each player has been seen to use. Public information. */
  extinguishersUsed: Record<number, number>;
  quip: Quip | null;
  lastPlay: LastPlay | null;
  /** Player ids in the order they exploded. */
  outOrder: number[];
  /** How many turns each player has started. */
  turnsTaken: Record<number, number>;
  winner: number | null;
  nextId: number;
}

export const AVATARS = ["🐔", "🐓", "🐥", "🐣", "🐤", "🪶", "🥚", "🍗"];
const BOT_NAMES = ["Nugget", "Drumstick", "Colonel", "Wingston", "Henrietta"];
const BOT_AVATARS = ["🐔", "🐓", "🐥", "🐣", "🐤"];
const SPARE_EXTINGUISHERS = { full: 2, quick: 1 }; // beyond the one dealt to each player

/** Hands shrink at bigger tables so the pile keeps enough cards to be a game. */
function handSize(players: number, quick: boolean): number {
  if (quick) return 4;
  return players >= 5 ? 5 : 7;
}
const MAX_LOG = 60;

// ---------- randomness ----------

export const rand = (n: number) => Math.floor(Math.random() * n);

export function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- lookups ----------

export function playerById(s: GameState, id: number): Player {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}

export const currentPlayer = (s: GameState): Player => s.players[s.current];

export const alivePlayers = (s: GameState): Player[] => s.players.filter((p) => p.alive);

/** The next living player after the given player index, following the current turn direction. */
export function nextAlive(s: GameState, fromIndex: number): Player {
  const n = s.players.length;
  let i = fromIndex;
  do i = (i + s.direction + n) % n;
  while (!s.players[i].alive);
  return s.players[i];
}

/** True for the one person playing solo: logs may say "you" and name their own cards. */
export const isYou = (s: GameState, p: Player): boolean => s.mode === "solo" && p.isHuman;

export const hasCard = (p: Player, kind: CardKind): Card | undefined => p.hand.find((c) => c.kind === kind);

// ---------- mutation helpers (used only by rules.ts) ----------

export function log(s: GameState, text: string, tone: LogEntry["tone"] = "normal") {
  s.log.push({ id: s.nextId++, text, tone });
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
}

export function cue(s: GameState, name: SfxName) {
  s.sfx = { id: s.nextId++, name };
}

export function setEvent(s: GameState, type: GameEvent["type"], playerId: number) {
  s.event = { id: s.nextId++, type, playerId };
}

export function takeFromHand(p: Player, cardIds: number[]): Card[] {
  return cardIds.map((id) => {
    const i = p.hand.findIndex((c) => c.id === id);
    if (i === -1) throw new Error("card not in hand");
    return p.hand.splice(i, 1)[0];
  });
}

export function forgetPileOrder(s: GameState) {
  for (const k of Object.keys(s.botKnowledge)) s.botKnowledge[Number(k)] = [];
}

/** The top card left the pile: everyone's picture of it shifts up by one. */
export function pileTopDrawn(s: GameState) {
  for (const k of Object.keys(s.botKnowledge)) s.botKnowledge[Number(k)].shift();
}

// ---------- setup ----------

export function newGame(setup: GameSetup): GameState {
  let nextId = 1;
  const mk = (kind: CardKind): Card => ({ id: nextId++, kind });
  const many = (kind: CardKind, n: number) => Array.from({ length: n }, () => mk(kind));
  const seat = (id: number, name: string, avatar: string, isHuman: boolean): Player => ({ id, name, avatar, isHuman, hand: [], alive: true });

  const players: Player[] =
    setup.mode === "solo"
      ? [seat(0, "You", "🧑", true), ...BOT_NAMES.slice(0, clamp(setup.count, 1, MAX_PLAYERS - 1)).map((n, i) => seat(i + 1, n, BOT_AVATARS[i], false))]
      : Array.from({ length: clamp(setup.count, 2, MAX_PLAYERS) }, (_, i) => {
          const given = setup.seats?.[i];
          return seat(i, given?.name.trim() || `Player ${i + 1}`, given?.avatar || AVATARS[i % AVATARS.length], true);
        });
  const n = players.length;
  const size = setup.quick ? "quick" : "full";
  const recipes = [setup.quick ? QUICK_DECK_RECIPE : DECK_RECIPE, BASE_EXTRAS, ...(setup.expansion ? [EXPANSION_RECIPE] : [])];

  // Deal from a deck without chickens or extinguishers, then mix the dangerous cards in.
  let deck = shuffleArray(recipes.flatMap((r) => (Object.entries(r) as [CardKind, number][]).flatMap(([k, count]) => many(k, count))));
  for (const p of players) {
    p.hand = [...deck.splice(0, handSize(n, setup.quick)), mk("extinguisher")];
  }
  deck = shuffleArray([...deck, ...many("chicken", n - 1), ...many("extinguisher", SPARE_EXTINGUISHERS[size])]);

  return {
    mode: setup.mode,
    difficulty: setup.difficulty,
    handLimit: setup.handLimit,
    expansion: setup.expansion,
    players,
    direction: 1,
    deck,
    discard: [],
    current: 0,
    turnsLeft: 1,
    pendingAttack: 0,
    phase: { type: "turn" },
    log: [],
    event: null,
    sfx: null,
    botKnowledge: Object.fromEntries(players.map((p) => [p.id, []])),
    extinguishersUsed: Object.fromEntries(players.map((p) => [p.id, 0])),
    quip: null,
    lastPlay: null,
    outOrder: [],
    turnsTaken: Object.fromEntries(players.map((p, i) => [p.id, i === 0 ? 1 : 0])),
    winner: null,
    nextId,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Re-exported so callers rarely need cards.ts directly.
export { PLAIN_KINDS };
