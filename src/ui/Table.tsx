import { alivePlayers, type GameState } from "../game";
import { CardView } from "./CardView";

interface Props {
  state: GameState;
  canDraw: boolean;
  /** Draws need confirming and the first tap has happened. */
  drawArmed: boolean;
  onDraw: () => void;
  onShowPile: () => void;
}

/** Draw pile, discard pile, and how dangerous the pile is right now. */
export function Table({ state, canDraw, drawArmed, onDraw, onShowPile }: Props) {
  const chickens = state.deck.filter((c) => c.kind === "chicken").length;
  const alive = alivePlayers(state).length;
  const top = state.discard[state.discard.length - 1];
  return (
    <div className="tablewrap">
      <div className="table">
        <button
          type="button"
          // keyed on the pile size so the stack "bumps" every time a card leaves it
          key={state.deck.length}
          className={["pile", "draw", "bump", canDraw && "ready", drawArmed && "armed"].filter(Boolean).join(" ")}
          disabled={!canDraw}
          onClick={onDraw}
          aria-label={drawArmed ? "Tap again to draw" : `Draw a card. ${state.deck.length} cards left`}
        >
          <span className="big">🐔</span>
          <span>{state.deck.length} left</span>
          <span className="pile-hint">{drawArmed ? "tap again" : canDraw ? "tap to draw" : "draw pile"}</span>
        </button>
        <button
          type="button"
          className="pile discard"
          disabled={!top}
          onClick={onShowPile}
          aria-label={top ? `Discard pile, ${state.discard.length} cards. Tap to see what’s been played.` : "Discard pile, empty"}
        >
          {top ? (
            // keyed on the card so each new top card lands with its own animation
            <div key={top.id} className="land">
              <CardView card={top} small />
            </div>
          ) : (
            "discard"
          )}
        </button>
      </div>
      <div className="danger">
        <span className="badge bad" title="Exploding chickens still in the pile">
          💥 {chickens} in pile
        </span>
        <span className="badge" title="Players still in">
          👥 {alive} playing
        </span>
        <span className="badge" title="Turn order" aria-label={state.direction === 1 ? "Turn order clockwise" : "Turn order reversed"}>
          {state.direction === 1 ? "↻ clockwise" : "↺ reversed"}
        </span>
      </div>
    </div>
  );
}
