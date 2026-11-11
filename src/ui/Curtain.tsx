import type { Player } from "../game";

interface Props {
  player: Player;
  reason: string;
  onReveal: () => void;
}

/** Hides the table between pass & play turns until the right person has the phone. */
export function Curtain({ player, reason, onReveal }: Props) {
  return (
    <div className="curtain" role="dialog" aria-modal="true" aria-labelledby="curtain-title">
      <div className="face">{player.avatar}</div>
      <h2 id="curtain-title">Pass the phone to {player.name}</h2>
      <p>{reason} Nobody else should be looking.</p>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the only thing to do on this screen */}
      <button type="button" autoFocus onClick={onReveal}>
        Show {player.name}’s cards
      </button>
    </div>
  );
}
