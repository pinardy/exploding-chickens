import { useState } from "react";
import { AVATARS, BASE_EXTRAS, CARD_INFO, DECK_RECIPE, EXPANSION_RECIPE, HAND_LIMIT, MAX_PLAYERS, type CardKind, type Difficulty, type GameSetup, type Mode, type Seat } from "../game";
import { play, unlockAudio } from "../sounds";
import { Logo } from "./Logo";
import { SettingsModal } from "./modals/SettingsModal";
import type { SavedGame } from "./savedGame";
import { loadStats } from "./stats";

const COUNTS: Record<Mode, number[]> = {
  solo: Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => i + 1),
  hotseat: Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => i + 2),
};
const LEVELS: { value: Difficulty; label: string; hint: string }[] = [
  { value: "chick", label: "🐥 Chick", hint: "Plays at random. Good for learning." },
  { value: "hen", label: "🐔 Hen", hint: "Peeks, dodges, grabs cards." },
  { value: "rooster", label: "🐓 Rooster", hint: "Remembers the pile and aims chickens at you." },
];
const BASE_KINDS: CardKind[] = ["chicken", "extinguisher", "skip", "peck", "reverse", "shuffle", "peek", "favor", "noway", "hen"];
const EXPANSION_KINDS = Object.keys(EXPANSION_RECIPE) as CardKind[];

const defaultSeats = (): Seat[] => Array.from({ length: MAX_PLAYERS }, (_, i) => ({ name: "", avatar: AVATARS[i] }));

interface Props {
  /** A game left unfinished on this device, if any. */
  saved: SavedGame | null;
  onStart: (setup: GameSetup) => void;
  onResume: () => void;
  onDiscardSaved: () => void;
}

export function Start({ saved, onStart, onResume, onDiscardSaved }: Props) {
  const [mode, setMode] = useState<Mode>("solo");
  const [bots, setBots] = useState(2);
  const [people, setPeople] = useState(2);
  const [seats, setSeats] = useState<Seat[]>(defaultSeats);
  const [difficulty, setDifficulty] = useState<Difficulty>("hen");
  const [handLimit, setHandLimit] = useState(false);
  const [quick, setQuick] = useState(false);
  const [expansion, setExpansion] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const stats = loadStats();

  const count = mode === "solo" ? bots : people;
  const setCount = mode === "solo" ? setBots : setPeople;

  const editSeat = (i: number, patch: Partial<Seat>) => setSeats((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const nextAvatar = (i: number) => {
    const taken = seats.filter((_, j) => j !== i && j < people).map((s) => s.avatar);
    let k = AVATARS.indexOf(seats[i].avatar);
    do k = (k + 1) % AVATARS.length;
    while (taken.includes(AVATARS[k]));
    editSeat(i, { avatar: AVATARS[k] });
  };

  const deal = () => {
    unlockAudio();
    play("shuffle");
    onStart({ mode, count, seats: mode === "hotseat" ? seats.slice(0, people) : undefined, difficulty, handLimit: handLimit ? HAND_LIMIT : null, quick, expansion });
  };

  const countOf = (k: CardKind) => DECK_RECIPE[k] ?? BASE_EXTRAS[k] ?? EXPANSION_RECIPE[k];

  return (
    <div className="start">
      <button type="button" className="gear" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
        ⚙️
      </button>
      <Logo />
      <h1>
        Exploding
        <br />
        Chickens
      </h1>
      <p>Draw cards. Don’t draw the chicken. Make everyone else draw the chicken.</p>
      {stats.games > 0 && (
        <p className="tally">
          {stats.games} game{stats.games === 1 ? "" : "s"} played on this phone. {stats.explosions} chicken{stats.explosions === 1 ? "" : "s"} exploded.
        </p>
      )}

      {saved && (
        <div className="resume">
          <div>
            <b>Game in progress</b>
            <small>{describeSaved(saved)}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              onResume();
            }}
          >
            Resume
          </button>
          <button type="button" className="ghost" onClick={onDiscardSaved} aria-label="Discard the saved game">
            Discard
          </button>
        </div>
      )}

      <div className="modes" role="group" aria-label="Game mode">
        <button type="button" className={mode === "solo" ? "" : "off"} onClick={() => setMode("solo")}>
          <span className="face">🤖</span>
          <span>Solo vs bots</span>
          <small>You against 1–5 computer players</small>
        </button>
        <button type="button" className={mode === "hotseat" ? "" : "off"} onClick={() => setMode("hotseat")}>
          <span className="face">📱</span>
          <span>Pass &amp; play</span>
          <small>2–6 people sharing this phone</small>
        </button>
      </div>

      <div className="choice" role="group" aria-label={mode === "solo" ? "Number of opponents" : "Number of players"}>
        <span>{mode === "solo" ? "Opponents" : "Players"}</span>
        {COUNTS[mode].map((n) => (
          <button key={n} type="button" className={n === count ? "" : "off"} onClick={() => setCount(n)}>
            {n}
          </button>
        ))}
      </div>

      {mode === "solo" ? (
        <div className="levels" role="group" aria-label="Bot difficulty">
          {LEVELS.map((l) => (
            <button key={l.value} type="button" className={difficulty === l.value ? "" : "off"} onClick={() => setDifficulty(l.value)}>
              <span>{l.label}</span>
              <small>{l.hint}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="seats" role="group" aria-label="Players">
          {seats.slice(0, people).map((seat, i) => (
            <div key={i} className="seatrow">
              <button type="button" className="avatar" aria-label="Change avatar" onClick={() => nextAvatar(i)}>
                {seat.avatar}
              </button>
              <input
                type="text"
                maxLength={14}
                placeholder={`Player ${i + 1}`}
                value={seat.name}
                aria-label={`Name of player ${i + 1}`}
                onChange={(e) => editSeat(i, { name: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <div className="variants">
        <label className="chip">
          <input type="checkbox" checked={expansion} onChange={(e) => setExpansion(e.target.checked)} />
          <span>Expansion cards</span>
          <small>Seven new cards in the mix</small>
        </label>
        <label className="chip">
          <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
          <span>Quick game</span>
          <small>Smaller deck, 4-card hands</small>
        </label>
        <label className="chip">
          <input type="checkbox" checked={handLimit} onChange={(e) => setHandLimit(e.target.checked)} />
          <span>Hand limit {HAND_LIMIT}</span>
          <small>Draw over it and you discard</small>
        </label>
      </div>

      <button type="button" className="deal" onClick={deal}>
        Deal the cards
      </button>

      <details className="rules">
        <summary>How to play</summary>
        <ul>
          <li>On your turn, play as many action cards as you like, then draw one card to end it.</li>
          <li>Draw an Exploding Chicken and you’re out — unless you hold an Extinguisher. Then you put the chicken back in the pile wherever you want.</li>
          <li>Skip, Reverse and Double Peck end your turn without drawing. Double Peck makes the next player take two turns, and it stacks.</li>
          <li>Two matching plain chickens steal a random card. Favor makes someone hand you a card of their choice.</li>
          <li>No Way cancels an opponent’s action card. You get a few seconds to use it.</li>
          <li>Tap a card to select it; press and hold to read what it does. Double-tap or swipe a card up to play it straight away.</li>
          <li>Tap the log to see everything that’s happened, and the discard pile to see what’s been played.</li>
          <li>In pass &amp; play, hand the phone over when the screen asks. Only the person holding it sees their cards.</li>
          <li>Last player standing wins.</li>
        </ul>
      </details>

      <details className="rules">
        <summary>The cards</summary>
        <h3>Base deck</h3>
        <ul className="cardlist">
          {BASE_KINDS.map((k) => (
            <li key={k}>
              <b>
                {CARD_INFO[k].emoji} {k === "hen" ? "Hen, Rooster, Chick, Egg" : CARD_INFO[k].name}
              </b>
              <span>
                {k === "chicken" ? "players − 1" : k === "extinguisher" ? "1 each + spares" : k === "hen" ? "4 each" : `×${countOf(k)}`}
              </span>
              <small>{CARD_INFO[k].text}</small>
            </li>
          ))}
        </ul>
        <h3>Expansion</h3>
        <ul className="cardlist">
          {EXPANSION_KINDS.map((k) => (
            <li key={k}>
              <b>
                {CARD_INFO[k].emoji} {CARD_INFO[k].name}
              </b>
              <span>×{countOf(k)}</span>
              <small>{CARD_INFO[k].text}</small>
            </li>
          ))}
        </ul>
      </details>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function describeSaved({ state }: SavedGame): string {
  const alive = state.players.filter((p) => p.alive).length;
  const who = state.mode === "solo" ? `vs ${state.players.length - 1} bot${state.players.length === 2 ? "" : "s"}` : `${state.players.length} players`;
  return `${state.mode === "solo" ? "Solo" : "Pass & play"} ${who} · ${alive} still in · ${state.deck.length} cards left`;
}
