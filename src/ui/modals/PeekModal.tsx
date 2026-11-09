import { useEffect, useState } from "react";
import type { Card } from "../../game";
import { CardView } from "../CardView";
import { Modal } from "./Modal";

const FLIP_GAP_MS = 380;

/** The top three cards, flipped over one at a time, next card first. */
export function PeekModal({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= cards.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 250 : FLIP_GAP_MS);
    return () => clearTimeout(t);
  }, [shown, cards.length]);

  return (
    <Modal title="Top of the pile">
      <p>Left is the next card you’d draw.</p>
      <div className="row">
        {cards.map((c, i) => (
          <div key={c.id} className={`flip ${i < shown ? "flipped" : ""}`}>
            <div className="flip-inner">
              <div className="flip-back card small cardback" aria-hidden="true">
                <span>🐔</span>
              </div>
              <div className="flip-front">
                <CardView card={c} small />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="buttons">
        <button type="button" onClick={onDone} disabled={shown < cards.length}>
          Got it
        </button>
      </div>
    </Modal>
  );
}
