import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CARD_INFO, type Card, type CardKind, type PlayError, type PlayKind } from "../game";
import { CardView } from "./CardView";

const DEAL_STAGGER_MS = 60;
/** When the hand is too wide, cards overlap, but always leave at least this much of each one showing. */
const MIN_VISIBLE_PX = 40;

// Same order as the card list, so matching cards sit next to each other.
const KIND_ORDER = Object.keys(CARD_INFO) as CardKind[];
const byKind = (a: Card, b: Card) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id - b.id;

interface Props {
  hand: Card[];
  selected: number[];
  /** What the selection would do, an error explaining why it can't, or null when nothing is selected. */
  playable: PlayKind | PlayError | null;
  canDraw: boolean;
  /** Draws need confirming and the first tap has happened. */
  drawArmed: boolean;
  onToggle: (cardId: number) => void;
  onQuickPlay: (cardId: number) => void;
  onHold: (card: Card) => void;
  onPlay: () => void;
  onDraw: () => void;
}

/**
 * Overlap the cards just enough that the whole hand fits the screen, like a
 * hand held in a fan. Past MIN_VISIBLE_PX of overlap the row scrolls instead.
 */
function useFan(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [overlap, setOverlap] = useState(0);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const fit = () => {
      const card = row.querySelector<HTMLElement>(".card");
      if (!card || count < 2) return setOverlap(0);
      const cs = getComputedStyle(row);
      const room = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      const w = card.offsetWidth;
      const spill = count * w + (count - 1) * gap - room;
      if (spill <= 0) return setOverlap(0);
      setOverlap(Math.min(spill / (count - 1), w + gap - MIN_VISIBLE_PX));
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(row);
    const first = row.querySelector(".card");
    if (first) ro?.observe(first); // card size setting
    return () => ro?.disconnect();
  }, [count]);
  return { ref, overlap };
}

/** The viewer's cards and the Play / Draw buttons. Tap to select, hold to read, double-tap or swipe up to play. */
export function Hand({ hand, selected, playable, canDraw, drawArmed, onToggle, onQuickPlay, onHold, onPlay, onDraw }: Props) {
  const sorted = useMemo(() => hand.slice().sort(byKind), [hand]);
  const { ref, overlap } = useFan(sorted.length);

  const kind = typeof playable === "string" ? playable : null;
  const error = playable && typeof playable !== "string" ? playable.error : null;
  const first = hand.find((c) => c.id === selected[0]);
  const playLabel = kind === "pair" ? "Play pair" : kind && first ? `Play ${CARD_INFO[first.kind].name}` : "Play";
  const info = first && CARD_INFO[first.kind];

  return (
    <div className="handwrap">
      {first && info && (
        <button type="button" className={`selinfo ${error ? "err" : ""}`} onClick={() => onHold(first)} aria-label={`${info.name}: ${info.text} Tap for the full card.`}>
          <span className="text">
            {error ? (
              error
            ) : (
              <>
                <b>{kind === "pair" ? "Pair" : info.name}:</b> {kind === "pair" ? "steal a random card from someone." : info.text}
              </>
            )}
          </span>
          <span className="more" aria-hidden="true">
            ⓘ
          </span>
        </button>
      )}
      <div ref={ref} className={`hand ${overlap > 0 ? "fanned" : ""}`} style={{ "--overlap": `${overlap}px` } as CSSProperties}>
        {sorted.length === 0 && <div className="hint empty">No cards in hand.</div>}
        {sorted.map((c, i) => (
          <CardView
            key={c.id}
            card={c}
            selected={selected.includes(c.id)}
            dealDelay={i * DEAL_STAGGER_MS}
            onClick={() => onToggle(c.id)}
            onHold={() => onHold(c)}
            onSwipeUp={() => onQuickPlay(c.id)}
          />
        ))}
      </div>
      <div className="actions">
        <button type="button" disabled={!kind} onClick={onPlay}>
          {playLabel}
        </button>
        <button type="button" className={`secondary ${drawArmed ? "armed" : ""}`} disabled={!canDraw} onClick={onDraw}>
          {drawArmed ? "Tap again to draw" : "Draw"}
        </button>
      </div>
    </div>
  );
}
