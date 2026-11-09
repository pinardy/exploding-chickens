import { useState } from "react";
import { startGame, type GameState } from "./game";
import { Game } from "./ui/Game";
import { Start } from "./ui/Start";
import { SettingsProvider } from "./ui/settings";

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  return (
    <SettingsProvider>
      {game ? <Game initial={game} onRestart={() => setGame(null)} /> : <Start onStart={(setup) => setGame(startGame(setup))} />}
    </SettingsProvider>
  );
}
