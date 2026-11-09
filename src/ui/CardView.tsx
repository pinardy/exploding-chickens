import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { CARD_INFO, type Card } from "../game";

const HOLD_MS = 420;

/** Shrinks `el`'s font in small steps until `overflows()` is false. */
function shrinkToFit(el: HTMLElement, overflows: () => boolean) {
  el.style.fontSize = "";
  let size = parseFloat(getComputedStyle(el).fontSize);
  for (let i = 0; i < 40 && overflows(); i++) {
    size -= 0.25;
    el.style.fontSize = `${size}px`;
  }
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Width in px of the widest word in `el`'s text, in its current font. */
function widestWord(el: HTMLElement): number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  const cs = getComputedStyle(el);
  measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return Math.max(0, ...(el.textContent ?? "").split(/\s+/).map((w) => measureCtx!.measureText(w).width));
}

/**
 * Keeps a card face's text inside the card:
 * - the title shrinks just enough that its longest word fits on one line, so
 *   names like "Extinguisher" never break mid-word;
 * - the description then shrinks until it ends above the card's bottom edge.
 * Re-fits when the card resizes (card-size setting) or the web font loads.
 * Everything is measured in layout px (canvas text metrics, offsets), so the
 * deal-in animation's rotate/scale transforms don't skew the result.
 */
function useFitFace(title: string, sub: string) {
  const titleRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const t = titleRef.current;
    const s = subRef.current;
    const card = t?.parentElement;
    if (!t || !s || !card) return;

    const titleOverflows = () => {
      const cs = getComputedStyle(t);
      const inner = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return widestWord(t) > inner - 1;
    };
    // .sub's offsetParent is the (position: relative) card.
    const subOverflows = () => s.offsetHeight > 0 && s.offsetTop + s.scrollHeight > card.clientHeight;

    const fit = () => {
      shrinkToFit(t, titleOverflows);
      shrinkToFit(s, subOverflows);
    };
    fit();
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(card);
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [title, sub]);
  return { titleRef, subRef };
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
  const { titleRef, subRef } = useFitFace(info.name, info.short);

  const className = ["card", small && "small", selected && "selected", onClick && "selectable"].filter(Boolean).join(" ");
  const style = { "--hue": info.hue, "--deal-delay": dealDelay !== undefined ? `${dealDelay}ms` : undefined } as CSSProperties;
  const face = (
    <>
      <div className="band">{info.emoji}</div>
      <div className="title" ref={titleRef}>{info.name}</div>
      <div className="sub" ref={subRef}>{info.short}</div>
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
