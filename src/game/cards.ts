// The deck: what each card is and what it says on its face.

export type PlainKind = "hen" | "rooster" | "chick" | "egg";
export type ActionKind =
  | "skip"
  | "peck"
  | "shuffle"
  | "peek"
  | "favor"
  // expansion
  | "reverse"
  | "escape"
  | "bottom"
  | "careful"
  | "fox"
  | "scramble";
export type CardKind = "chicken" | "extinguisher" | "noway" | "hot" | ActionKind | PlainKind;

/** What a play resolves to. "pair" is two matching plain chickens. */
export type PlayKind = ActionKind | "pair";

export interface Card {
  id: number;
  kind: CardKind;
}

export interface CardInfo {
  name: string;
  emoji: string;
  text: string; // full rules text
  short: string; // fits on the card face
  hue: string; // CSS color for the card's band
}

const PLAIN_TEXT = "Plain chicken. Play two of a kind to steal a random card.";

export const CARD_INFO: Record<CardKind, CardInfo> = {
  chicken: { name: "Exploding Chicken", emoji: "💥", text: "Draw this and you're cooked — unless you have an Extinguisher.", short: "You're cooked.", hue: "#b5392c" },
  extinguisher: { name: "Extinguisher", emoji: "🧯", text: "Put out an Exploding Chicken, then slip it back into the pile anywhere you like.", short: "Puts out a chicken.", hue: "#2f8f6f" },
  skip: { name: "Skip", emoji: "🏃", text: "End your turn without drawing a card.", short: "End turn, no draw.", hue: "#3a7bd5" },
  peck: { name: "Double Peck", emoji: "⚡", text: "End your turn without drawing. The next player must take two turns.", short: "End turn. Next player takes 2.", hue: "#d9601a" },
  shuffle: { name: "Coop Shuffle", emoji: "🔀", text: "Shuffle the draw pile.", short: "Shuffle the pile.", hue: "#7a4fb5" },
  peek: { name: "Peek", emoji: "👁️", text: "Look at the top three cards of the draw pile.", short: "See the top 3 cards.", hue: "#2a9d8f" },
  favor: { name: "Favor", emoji: "🤝", text: "Pick a player. They give you a card of their choice.", short: "They give you a card.", hue: "#c2893c" },
  noway: { name: "No Way", emoji: "✋", text: "Cancel another player's action card. Play it any time.", short: "Cancel an action card.", hue: "#444" },
  reverse: { name: "Reverse", emoji: "🔁", text: "End your turn without drawing, and flip the turn order.", short: "End turn, flip order.", hue: "#3a7bd5" },
  escape: { name: "Great Escape", emoji: "🪂", text: "End your turn without drawing, even if you owe several turns.", short: "End all your turns.", hue: "#1f6fb5" },
  bottom: { name: "Bottom Feeder", emoji: "🐛", text: "End your turn by drawing from the bottom of the pile instead of the top.", short: "Draw from the bottom.", hue: "#6b8e23" },
  careful: { name: "Careful Peck", emoji: "🔍", text: "End your turn by drawing the first card that isn't an Exploding Chicken. If they're all chickens, you simply skip.", short: "Draw the first safe card.", hue: "#2a9d8f" },
  fox: { name: "Fox in the Henhouse", emoji: "🦊", text: "Pick a player. All their Favor and plain chicken cards are destroyed.", short: "Destroy their steal cards.", hue: "#c2520f" },
  scramble: { name: "Coop Scramble", emoji: "🌪️", text: "Everyone's hands are pooled, shuffled and dealt back out. Card counts stay the same.", short: "Redeal everyone's hands.", hue: "#7a4fb5" },
  hot: { name: "Hot Chicken", emoji: "🌶️", text: "Can't be played. If you draw an Exploding Chicken while holding this, the chicken is tossed to the next player, who must deal with it.", short: "Toss a drawn chicken onward.", hue: "#b5392c" },
  hen: { name: "Hen", emoji: "🐔", text: PLAIN_TEXT, short: "Pair up to steal.", hue: "#8c6a4a" },
  rooster: { name: "Rooster", emoji: "🐓", text: PLAIN_TEXT, short: "Pair up to steal.", hue: "#8c6a4a" },
  chick: { name: "Chick", emoji: "🐥", text: PLAIN_TEXT, short: "Pair up to steal.", hue: "#8c6a4a" },
  egg: { name: "Egg", emoji: "🥚", text: "Plain chicken (almost). Play two of a kind to steal a random card.", short: "Pair up to steal.", hue: "#8c6a4a" },
};

export const PLAIN_KINDS: PlainKind[] = ["hen", "rooster", "chick", "egg"];

/** How many of each card go in the deck, before per-player dealing. Chickens and extinguishers are added by newGame. */
export const DECK_RECIPE: Partial<Record<CardKind, number>> = {
  skip: 4,
  peck: 4,
  shuffle: 4,
  peek: 5,
  favor: 4,
  noway: 5,
  hen: 4,
  rooster: 4,
  chick: 4,
  egg: 4,
};

/** A shorter deck for a five-minute game. */
export const QUICK_DECK_RECIPE: Partial<Record<CardKind, number>> = {
  skip: 3,
  peck: 3,
  shuffle: 2,
  peek: 3,
  favor: 2,
  noway: 3,
  hen: 3,
  rooster: 3,
  chick: 3,
  egg: 3,
};

/** Extra cards mixed in when the expansion is on. */
export const EXPANSION_RECIPE: Partial<Record<CardKind, number>> = {
  reverse: 4,
  escape: 3,
  bottom: 4,
  careful: 4,
  fox: 2,
  scramble: 2,
  hot: 1,
};

/** Reverse joins the base deck in every game. */
export const BASE_EXTRAS: Partial<Record<CardKind, number>> = { reverse: 4 };

export const isPlain = (k: CardKind): k is PlainKind => (PLAIN_KINDS as CardKind[]).includes(k);

export const needsTarget = (kind: PlayKind): boolean => kind === "favor" || kind === "pair" || kind === "fox";

export const cardName = (c: Card) => CARD_INFO[c.kind].name;
