import { useLayoutEffect, useRef } from "react";
import type { Card, LogEntry } from "../../game";
import { CardView } from "../CardView";
import { Modal } from "./Modal";

/** Everything that's happened this game, newest at the bottom, opened scrolled to the end. */
export function LogModal({ log, onClose }: { log: LogEntry[]; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Braces matter: newer browsers return a Promise here, which React would take for a cleanup function.
    end.current?.scrollIntoView({ block: "end" });
  }, []);
  return (
    <Modal title="What’s happened" onClose={onClose}>
      <div className="history">
        {log.map((l) => (
          <div key={l.id} className={l.tone}>
            {l.text}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Back to the game
        </button>
      </div>
    </Modal>
  );
}

const PILE_SHOWN = 18;

/** The discard pile, newest first. */
export function PileModal({ discard, onClose }: { discard: Card[]; onClose: () => void }) {
  const recent = discard.slice(-PILE_SHOWN).reverse();
  return (
    <Modal title="Discard pile" onClose={onClose}>
      <p>
        {discard.length} card{discard.length === 1 ? "" : "s"} played so far
        {discard.length > PILE_SHOWN ? `. The last ${PILE_SHOWN}, newest first:` : ", newest first:"}
      </p>
      <div className="row pile-cards">
        {recent.map((c) => (
          <CardView key={c.id} card={c} small />
        ))}
      </div>
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Back to the game
        </button>
      </div>
    </Modal>
  );
}
