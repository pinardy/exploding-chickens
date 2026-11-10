import { isYou, playerById, type GameState, type Player } from "../game";
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
    <div className="over">
      <div className="trophy">{won || !solo ? "🏆" : "🍗"}</div>
      <h2>{won ? "You win!" : `${winner.name} wins!`}</h2>
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

      {solo && stats && stats.games > 0 && (
        <p className="record">
          On this phone: {stats.wins} solo win{stats.wins === 1 ? "" : "s"} in {stats.games} game{stats.games === 1 ? "" : "s"}
        </p>
      )}

      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" className="ghost" onClick={onMenu}>
        Back to menu
      </button>
    </div>
  );
}
