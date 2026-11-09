import type { Player } from "../game";

interface Props {
  winner: Player;
  isYou: boolean;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function GameOver({ winner, isYou, onPlayAgain, onMenu }: Props) {
  return (
    <div className="over">
      <div className="trophy">{isYou ? "🏆" : "🍗"}</div>
      <h2>{isYou ? "You win!" : `${winner.name} wins!`}</h2>
      <p>{winner.isHuman ? "Last chicken standing. The coop is theirs." : "Better luck next hatch."}</p>
      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" className="ghost" onClick={onMenu}>
        Back to menu
      </button>
    </div>
  );
}
