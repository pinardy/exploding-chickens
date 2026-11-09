import { useState } from "react";
import type { Card } from "../../game";
import { CardView } from "../CardView";
import { Modal } from "./Modal";

/** Over the hand limit: pick `count` cards to discard. */
export function DiscardModal({ hand, count, onDiscard }: { hand: Card[]; count: number; onDiscard: (ids: number[]) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-count)));
  return (
    <Modal title={`Hand limit: discard ${count}`}>
      <p>Too many cards. Choose {count === 1 ? "one to let go" : `${count} to let go`}.</p>
      <div className="row">
        {hand.map((c) => (
          <CardView key={c.id} card={c} small selected={picked.includes(c.id)} onClick={() => toggle(c.id)} />
        ))}
      </div>
      <div className="buttons">
        <button type="button" disabled={picked.length !== count} onClick={() => onDiscard(picked)}>
          Discard
        </button>
      </div>
    </Modal>
  );
}
