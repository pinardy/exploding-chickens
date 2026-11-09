import { useState } from "react";
import { startGame, type GameSetup } from "./game";
import { Game } from "./ui/Game";
import { Start } from "./ui/Start";
import { clearSavedGame, loadSavedGame, type SavedGame } from "./ui/savedGame";
import { SettingsProvider } from "./ui/settings";

interface Session extends SavedGame {
  /** Bumped for every new game so <Game> starts fresh. */
  key: number;
  /** Picked up from storage rather than dealt just now. */
  resumed: boolean;
}

export default function App() {
  const [game, setGame] = useState<Session | null>(null);
  const [saved, setSaved] = useState(loadSavedGame);

  const deal = (setup: GameSetup) => setGame((g) => ({ key: (g?.key ?? 0) + 1, setup, state: startGame(setup), viewer: 0, resumed: false }));
  const resume = () => saved && setGame({ ...saved, key: 1, resumed: true });
  const exit = () => {
    setGame(null);
    setSaved(loadSavedGame());
  };
  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  return (
    <SettingsProvider>
      {game ? (
        <Game
          key={game.key}
          setup={game.setup}
          initial={game.state}
          initialViewer={game.viewer}
          resumed={game.resumed}
          onExit={exit}
          onNewGame={() => deal(game.setup)}
        />
      ) : (
        <Start saved={saved} onStart={deal} onResume={resume} onDiscardSaved={discardSaved} />
      )}
    </SettingsProvider>
  );
}
