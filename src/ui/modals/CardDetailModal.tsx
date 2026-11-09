import { CARD_INFO, type Card } from "../../game";
import { CardView } from "../CardView";
import { Modal } from "./Modal";

/** Shown on tap-and-hold: the card at full size with its complete rules text. */
export function CardDetailModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const info = CARD_INFO[card.kind];
  return (
    <Modal title={info.name}>
      <div className="row">
        <CardView card={card} />
      </div>
      <p className="rules-text">{info.text}</p>
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
