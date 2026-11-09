import type { Player } from "../game";

interface Props {
  player: Player;
  reason: string;
  onReveal: () => void;
}

/** Hides the table between pass & play turns until the right person has the phone. */
export function Curtain({ player, reason, onReveal }: Props) {
  return (
    <div className="curtain">
      <div className="face">{player.avatar}</div>
      <h2>Pass the phone to {player.name}</h2>
      <p>{reason} Nobody else should be looking.</p>
      <button type="button" onClick={onReveal}>
        Show {player.name}’s cards
      </button>
    </div>
  );
}
