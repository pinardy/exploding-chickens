import { activeBot, activeHuman, botStep, letItHappen, type GameState } from "../game";

const MAX_STEPS = 5000;

/**
 * Play the rest of the game out instantly. Only for when no person is left
 * with a decision to make (you're out of a solo game): bots take every step,
 * and No Way windows close as soon as the bots have passed.
 */
export function fastForward(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < MAX_STEPS && s.winner === null; i++) {
    if (activeHuman(s) !== null) break;
    if (activeBot(s) !== null) s = botStep(s);
    else if (s.phase.type === "nopeWindow") s = letItHappen(s);
    else break;
  }
  return { ...s, event: null, quip: null, sfx: null };
}
