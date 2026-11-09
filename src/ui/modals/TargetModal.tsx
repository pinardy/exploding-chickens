import type { Player, PlayKind } from "../../game";
import { Modal } from "./Modal";

interface Props {
  kind: PlayKind;
  targets: Player[];
  onPick: (playerId: number) => void;
  onCancel: () => void;
}

export function TargetModal({ kind, targets, onPick, onCancel }: Props) {
  return (
    <Modal title={kind === "pair" ? "Steal from whom?" : kind === "fox" ? "Send the fox to whom?" : "Ask whom for a favor?"}>
      <div className="targets">
        {targets.map((p) => (
          <button key={p.id} type="button" className="secondary" disabled={p.hand.length === 0} onClick={() => onPick(p.id)}>
            <span>{p.name}</span>
            <span>{p.hand.length} cards</span>
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
