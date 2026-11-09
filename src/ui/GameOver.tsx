import type { Player } from "../game";

export function GameOver({ winner, isYou, onRestart }: { winner: Player; isYou: boolean; onRestart: () => void }) {
  return (
    <div className="over">
      <div className="trophy">{isYou ? "🏆" : "🍗"}</div>
      <h2>{isYou ? "You win!" : `${winner.name} wins!`}</h2>
      <p>{winner.isHuman ? "Last chicken standing. The coop is theirs." : "Better luck next hatch."}</p>
      <button type="button" onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}
