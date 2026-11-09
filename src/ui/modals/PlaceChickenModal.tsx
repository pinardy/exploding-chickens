import { Modal } from "./Modal";

const SHOWN_SLOTS = 8;
const ordinal = (i: number) => (i === 0 ? "Top" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`);

/** Choose how deep in the pile a defused chicken goes back. */
export function PlaceChickenModal({ deckSize, onPlace }: { deckSize: number; onPlace: (depth: number) => void }) {
  const slots = Math.min(deckSize + 1, SHOWN_SLOTS);
  return (
    <Modal title="Put the chicken back">
      <p>Pick how deep in the pile it goes. Nobody else will know.</p>
      <div className="slots">
        {Array.from({ length: slots }, (_, i) => (
          <button key={i} type="button" className="secondary" onClick={() => onPlace(i)}>
            {ordinal(i)}
          </button>
        ))}
        {deckSize + 1 > SHOWN_SLOTS && (
          <button type="button" className="secondary" onClick={() => onPlace(deckSize)}>
            Bottom
          </button>
        )}
        <button type="button" onClick={() => onPlace(Math.floor(Math.random() * (deckSize + 1)))}>
          Random
        </button>
      </div>
    </Modal>
  );
}
