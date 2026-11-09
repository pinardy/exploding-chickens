import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { CARD_INFO, type Card } from "../game";

const HOLD_MS = 420;

/**
 * Shrinks a card title's font just enough that its longest word fits on one
 * line, so names like "Extinguisher" never break mid-word. Re-fits when the
 * card resizes (card-size setting) or the web font finishes loading.
 */
function useFitTitle(text: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const range = document.createRange();
    // Widest line of text vs. the space inside the padding. Both come from
    // getBoundingClientRect so sub-pixel widths and any CSS transform on the
    // card (deal / select animations) cancel out.
    const overflow = (pad: number) => {
      range.selectNodeContents(el);
      const box = el.getBoundingClientRect();
      const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
      return range.getBoundingClientRect().width - (box.width - pad * scale) + 0.5 * scale;
    };
    const fit = () => {
      el.style.fontSize = "";
      const cs = getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      if (overflow(pad) <= 0) return;
      // Shrink in small steps until the longest word fits on its line.
      let size = parseFloat(cs.fontSize);
      for (let i = 0; i < 40 && overflow(pad) > 0; i++) {
        size -= 0.25;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el.parentElement ?? el);
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [text]);
  return ref;
}

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
  const titleRef = useFitTitle(info.name);

  const className = ["card", small && "small", selected && "selected", onClick && "selectable"].filter(Boolean).join(" ");
  const style = { "--hue": info.hue, "--deal-delay": dealDelay !== undefined ? `${dealDelay}ms` : undefined } as CSSProperties;
  const face = (
    <>
      <div className="band">{info.emoji}</div>
      <div className="title" ref={titleRef}>{info.name}</div>
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
