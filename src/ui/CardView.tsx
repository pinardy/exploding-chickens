import { useRef, type CSSProperties, type PointerEvent } from "react";
import { CARD_INFO, type Card } from "../game";

const HOLD_MS = 420;

interface Props {
  card: Card;
  small?: boolean;
  selected?: boolean;
  /** Entry animation delay, for dealing a hand one card at a time. */
  dealDelay?: number;
  onClick?: () => void;
  /** Tap-and-hold. When it fires, the following click is swallowed. */
  onHold?: () => void;
}

export function CardView({ card, small, selected, dealDelay, onClick, onHold }: Props) {
  const info = CARD_INFO[card.kind];
  const timer = useRef<number | null>(null);
  const held = useRef(false);

  const className = ["card", small && "small", selected && "selected", onClick && "selectable"].filter(Boolean).join(" ");
  const style = { "--hue": info.hue, "--deal-delay": dealDelay !== undefined ? `${dealDelay}ms` : undefined } as CSSProperties;
  const face = (
    <>
      <div className="band">{info.emoji}</div>
      <div className="title">{info.name}</div>
      <div className="sub">{info.short}</div>
    </>
  );
  if (!onClick) {
    return (
      <div className={className} style={style}>
        {face}
      </div>
    );
  }

  const startHold = (e: PointerEvent) => {
    if (!onHold || e.button !== 0) return;
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onHold();
    }, HOLD_MS);
  };
  const cancelHold = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const click = () => {
    if (held.current) {
      held.current = false;
      return;
    }
    onClick();
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={click}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={!!selected}
    >
      {face}
    </button>
  );
}
