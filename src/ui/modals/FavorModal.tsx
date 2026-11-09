import type { Card } from "../../game";
import { CardView } from "../CardView";
import { Modal } from "./Modal";

interface Props {
  askerName: string;
  giverLabel: string; // "you" or the giver's name
  hand: Card[];
  onGive: (cardId: number) => void;
}

export function FavorModal({ askerName, giverLabel, hand, onGive }: Props) {
  return (
    <Modal title={`${askerName} asks ${giverLabel} for a favor`}>
      <p>Hand over one card of your choice.</p>
      <div className="row">
        {hand.map((c) => (
          <CardView key={c.id} card={c} small onClick={() => onGive(c.id)} />
        ))}
      </div>
    </Modal>
  );
}
