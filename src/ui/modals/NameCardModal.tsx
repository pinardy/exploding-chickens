import { BASE_EXTRAS, CARD_INFO, DECK_RECIPE, EXPANSION_RECIPE, type CardKind } from "../../game";
import { Modal } from "./Modal";

interface Props {
  targetName: string;
  /** Expansion cards are only worth asking for when they're in the deck. */
  expansion: boolean;
  onName: (kind: CardKind) => void;
  onCancel: () => void;
}

// Cards that only come with the expansion (Reverse is in the base game too).
const EXPANSION = new Set(Object.keys(EXPANSION_RECIPE).filter((k) => !(k in DECK_RECIPE) && !(k in BASE_EXTRAS)));
// Exploding Chickens never sit in a hand, so there's no point asking for one.
const ALL = (Object.keys(CARD_INFO) as CardKind[]).filter((k) => k !== "chicken");

/** Three of a kind: say which card you want from the player you picked. */
export function NameCardModal({ targetName, expansion, onName, onCancel }: Props) {
  const kinds = ALL.filter((k) => expansion || !EXPANSION.has(k));
  return (
    <Modal title={`Which card do you want from ${targetName}?`} onClose={onCancel}>
      <p>If they have one, they hand it over. If not, you get nothing.</p>
      <div className="namegrid">
        {kinds.map((k) => (
          <button key={k} type="button" className={`secondary ${k === "extinguisher" ? "suggested" : ""}`} onClick={() => onName(k)}>
            <span className="emoji" aria-hidden="true">
              {CARD_INFO[k].emoji}
            </span>
            <span>{CARD_INFO[k].name}</span>
          </button>
        ))}
      </div>
      <div className="buttons">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
