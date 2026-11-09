import { alivePlayers, type GameState } from "../game";
import { CardView } from "./CardView";

interface Props {
  state: GameState;
  canDraw: boolean;
  onDraw: () => void;
}

/** Draw pile, discard pile, and how dangerous the pile is right now. */
export function Table({ state, canDraw, onDraw }: Props) {
  const chickens = state.deck.filter((c) => c.kind === "chicken").length;
  const top = state.discard[state.discard.length - 1];
  return (
    <div className="tablewrap">
      <div className="table">
        <button
          type="button"
          // keyed on the pile size so the stack "bumps" every time a card leaves it
          key={state.deck.length}
          className={`pile draw bump ${canDraw ? "ready" : ""}`}
          disabled={!canDraw}
          onClick={onDraw}
          aria-label={`Draw a card. ${state.deck.length} cards left`}
        >
          <span className="big">🐔</span>
          <span>{state.deck.length} left</span>
          <span className="pile-hint">{canDraw ? "tap to draw" : "draw pile"}</span>
        </button>
        <div className="pile discard">
          {top ? (
            // keyed on the card so each new top card lands with its own animation
            <div key={top.id} className="land">
              <CardView card={top} small />
            </div>
          ) : (
            "discard"
          )}
        </div>
      </div>
      <div className="danger">
        {chickens} exploding chicken{chickens === 1 ? "" : "s"} still in the pile, {alivePlayers(state).length} players still in
        <span className="direction" title="Turn order" aria-label={state.direction === 1 ? "Turn order clockwise" : "Turn order reversed"}>
          {state.direction === 1 ? "↻" : "↺"}
        </span>
      </div>
    </div>
  );
}
