import type { CSSProperties } from "react";
import { type Player, actionLabel, type PendingAction } from "../../game";
import { Modal } from "./Modal";

interface Props {
  action: PendingAction;
  actor: Player;
  candidates: Player[];
  viewerId: number;
  hotseat: boolean;
  seconds: number;
  onNoWay: (playerId: number) => void;
  onLetItHappen: () => void;
}

/** A timed chance for anyone holding No Way to cancel the action just played. */
export function NoWayModal({ action, actor, candidates, viewerId, hotseat, seconds, onNoWay, onLetItHappen }: Props) {
  const onYou = action.targetId === viewerId ? " on you" : "";
  return (
    <Modal title={`${actor.name} played ${actionLabel(action)}${onYou}`}>
      <p>{hotseat ? "Anyone holding a No Way card can cancel it. Quick!" : "Cancel it with No Way?"}</p>
      {/* keyed on the action so the bar restarts for each new window */}
      <div className="countdown" key={action.cards[0].id} style={{ "--secs": `${seconds}s` } as CSSProperties}>
        <i />
      </div>
      <div className="buttons">
        <button type="button" className="ghost" onClick={onLetItHappen}>
          Let it happen
        </button>
        {candidates.map((p) => (
          <button key={p.id} type="button" className="danger wide" onClick={() => onNoWay(p.id)}>
            ✋ {hotseat ? `${p.name}: No Way!` : "No Way!"}
          </button>
        ))}
      </div>
    </Modal>
  );
}
