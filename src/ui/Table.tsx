import { useLayoutEffect, useRef } from "react";
import { alivePlayers, CARD_INFO, type CardKind, type GameState } from "../game";
import { CardView } from "./CardView";

/** How many known cards to list beside the pile. */
const KNOWN_SHOWN = 4;

interface Props {
  state: GameState;
  /** Whose knowledge of the pile to show (only ever the person holding the phone). */
  viewerId: number;
  canDraw: boolean;
  /** Draws need confirming and the first tap has happened. */
  drawArmed: boolean;
  onDraw: () => void;
  onShowPile: () => void;
}

/** What you know about the top of the pile, top first, with unknown slots in between as "?". */
function knownTop(state: GameState, viewerId: number): (CardKind | null)[] {
  const known = (state.botKnowledge[viewerId] ?? []).slice(0, Math.min(KNOWN_SHOWN, state.deck.length));
  while (known.length > 0 && known[known.length - 1] === null) known.pop();
  return known;
}

/** Draw pile, discard pile, what you know about the pile, and how dangerous it is right now. */
export function Table({ state, viewerId, canDraw, drawArmed, onDraw, onShowPile }: Props) {
  const chickens = state.deck.filter((c) => c.kind === "chicken").length;
  const alive = alivePlayers(state).length;
  const top = state.discard[state.discard.length - 1];
  const known = knownTop(state, viewerId);
  const land = useLandFrom(state, viewerId, top?.id);

  return (
    <div className="tablewrap">
      <div className="table">
        {known.length > 0 && (
          <div className="known" aria-label={`You know the top of the pile: ${known.map((k) => (k ? CARD_INFO[k].name : "unknown")).join(", ")}`}>
            <span className="known-label">🔍 Top</span>
            {known.map((k, i) => (
              <span key={i} className={`known-card ${k === "chicken" ? "bad" : ""}`} title={k ? CARD_INFO[k].name : "Unknown"}>
                {k ? CARD_INFO[k].emoji : "?"}
              </span>
            ))}
          </div>
        )}
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
            <div key={top.id} ref={land} className="land">
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

/**
 * When the new top card was just played, start its landing animation from
 * whoever played it: their seat, or your hand. Runs before paint, so the card
 * never flashes in its final spot first.
 */
function useLandFrom(state: GameState, viewerId: number, topId: number | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const play = state.lastPlay;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || topId === undefined || !play?.cardIds.includes(topId)) return;
    const from = play.actorId === viewerId ? document.querySelector(".handwrap") : document.querySelector(`[data-seat="${play.actorId}"]`);
    if (!from) return;
    const a = from.getBoundingClientRect();
    // Measure the pile, not the card: the card's own animation is already moving it.
    const b = (el.parentElement ?? el).getBoundingClientRect();
    el.style.setProperty("--from-x", `${a.left + a.width / 2 - (b.left + b.width / 2)}px`);
    el.style.setProperty("--from-y", `${a.top + a.height / 2 - (b.top + b.height / 2)}px`);
    el.classList.add("from-player");
    // Only on a new top card: the play it came from is fixed by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topId]);
  return ref;
}
