import type { Player, Quip } from "../game";

/** From this many opponents the seats shrink to one compact row so the hand stays on screen. */
const COMPACT_FROM = 4;

interface Props {
  players: Player[];
  currentId: number;
  /** The bot currently deciding, if any: its seat wobbles. */
  thinkingId: number | null;
  quip: Quip | null;
}

/** The other players around the table, with card counts, a thinking wobble and speech bubbles. */
export function Seats({ players, currentId, thinkingId, quip }: Props) {
  return (
    <div className={`opponents ${players.length >= COMPACT_FROM ? "compact" : ""}`}>
      {players.map((p) => (
        <div
          key={p.id}
          className={["seat", currentId === p.id && "active", !p.alive && "out", thinkingId === p.id && "thinking"].filter(Boolean).join(" ")}
        >
          {quip?.playerId === p.id && (
            <div key={quip.id} className="bubble" role="status">
              {quip.text}
            </div>
          )}
          {thinkingId === p.id && !quip && (
            <div className="bubble dots" aria-label={`${p.name} is thinking`}>
              <i />
              <i />
              <i />
            </div>
          )}
          <div className="face">{p.alive ? p.avatar : "🍗"}</div>
          <div className="name">{p.name}</div>
          <div className="count">{p.alive ? `${p.hand.length} card${p.hand.length === 1 ? "" : "s"}` : "out"}</div>
          <div className="fan" aria-hidden="true">
            {Array.from({ length: Math.min(8, p.hand.length) }, (_, k) => (
              <i key={k} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
