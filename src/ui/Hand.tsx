import { CARD_INFO, type Card, type PlayError, type PlayKind } from "../game";
import { CardView } from "./CardView";

const DEAL_STAGGER_MS = 60;

interface Props {
  hand: Card[];
  selected: number[];
  /** What the selection would do, an error explaining why it can't, or null when nothing is selected. */
  playable: PlayKind | PlayError | null;
  canDraw: boolean;
  onToggle: (cardId: number) => void;
  onHold: (card: Card) => void;
  onPlay: () => void;
  onDraw: () => void;
}

/** The viewer's cards and the Play / Draw buttons. Tap to select, hold to read. */
export function Hand({ hand, selected, playable, canDraw, onToggle, onHold, onPlay, onDraw }: Props) {
  const kind = typeof playable === "string" ? playable : null;
  const error = playable && typeof playable !== "string" ? playable.error : null;
  const first = hand.find((c) => c.id === selected[0]);
  const playLabel = kind === "pair" ? "Play pair" : kind && first ? `Play ${CARD_INFO[first.kind].name}` : "Play";

  return (
    <div className="handwrap">
      <div className="hand">
        {hand.length === 0 && <div className="hint empty">No cards in hand.</div>}
        {hand.map((c, i) => (
          <CardView
            key={c.id}
            card={c}
            selected={selected.includes(c.id)}
            dealDelay={i * DEAL_STAGGER_MS}
            onClick={() => onToggle(c.id)}
            onHold={() => onHold(c)}
          />
        ))}
      </div>
      <div className="actions">
        <button type="button" disabled={!kind} onClick={onPlay}>
          {playLabel}
        </button>
        <button type="button" className="secondary" disabled={!canDraw} onClick={onDraw}>
          Draw
        </button>
        {error && <span className="hint">{error}</span>}
      </div>
    </div>
  );
}
