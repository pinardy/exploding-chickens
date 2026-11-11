import { isYou, playerById, type GameState, type Player } from "../game";
import type { Difficulty } from "../game";
import type { Stats } from "./stats";

interface Props {
  state: GameState;
  /** Whose phone it is: in solo, you. */
  viewerId: number;
  /** Lifetime tally including this game, once it's been recorded. */
  stats: Stats | null;
  onPlayAgain: () => void;
  onMenu: () => void;
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Winner first, then everyone else from last out to first out. */
function standings(state: GameState): Player[] {
  const out = state.outOrder ?? [];
  const winner = state.winner !== null ? [playerById(state, state.winner)] : [];
  const rest = [...out].reverse().map((id) => playerById(state, id));
  const unplaced = state.players.filter((p) => !winner.includes(p) && !rest.includes(p));
  return [...winner, ...rest, ...unplaced];
}

export function GameOver({ state, viewerId, stats, onPlayAgain, onMenu }: Props) {
  const winner = playerById(state, state.winner!);
  const viewer = playerById(state, viewerId);
  const solo = state.mode === "solo";
  const won = solo && winner.id === viewer.id;
  const table = standings(state);
  const place = table.indexOf(viewer) + 1;
  const turns = state.turnsTaken?.[viewer.id] ?? 0;

  return (
    <div className="over" role="dialog" aria-modal="true" aria-labelledby="over-title">
      <div className="trophy">{won || !solo ? "🏆" : "🍗"}</div>
      <h2 id="over-title">{won ? "You win!" : `${winner.name} wins!`}</h2>
      {solo ? (
        <p>
          {won ? "Last chicken standing. " : `You finished ${ordinal(place)} of ${table.length}. `}
          You lasted {turns} turn{turns === 1 ? "" : "s"}.
        </p>
      ) : (
        <p>Last chicken standing. The coop is theirs.</p>
      )}

      <ol className="standings">
        {table.map((p, i) => (
          <li key={p.id} className={p.id === viewer.id && solo ? "me" : ""}>
            <span className="place">{ordinal(i + 1)}</span>
            <span className="who">
              {i === 0 ? p.avatar : "🍗"} {isYou(state, p) ? "You" : p.name}
            </span>
            <span className="turns">
              {state.turnsTaken?.[p.id] ?? 0} turn{(state.turnsTaken?.[p.id] ?? 0) === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ol>

      {solo && stats && <Record stats={stats} difficulty={state.difficulty} won={won} />}

      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the game is over; this is the next step */}
      <button type="button" autoFocus onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" className="ghost" onClick={onMenu}>
        Back to menu
      </button>
    </div>
  );
}

const LEVEL_NAMES: Record<Difficulty, string> = { chick: "Chick", hen: "Hen", rooster: "Rooster" };

/** Your record at this difficulty, and the win streak. */
function Record({ stats, difficulty, won }: { stats: Stats; difficulty: Difficulty; won: boolean }) {
  const level = stats.byLevel[difficulty];
  const newBest = won && stats.streak > 1 && stats.streak === stats.bestStreak;
  return (
    <p className="record">
      Against {LEVEL_NAMES[difficulty]} bots: {level.wins} win{level.wins === 1 ? "" : "s"} in {level.games} game{level.games === 1 ? "" : "s"}
      {won ? (
        <>
          <br />
          {stats.streak} win{stats.streak === 1 ? "" : "s"} in a row{newBest ? " · a new best! 🔥" : ` · best ${stats.bestStreak}`}
        </>
      ) : (
        stats.bestStreak > 0 && (
          <>
            <br />
            Win streak reset · best {stats.bestStreak}
          </>
        )
      )}
    </p>
  );
}
