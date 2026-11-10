import { useEffect, type Dispatch, type SetStateAction } from "react";
import { activeBot, botStep, clearEvent, clearQuip, letItHappen, type GameState } from "../game";
import { BOT_MOVE_MS, BOT_NOPE_MS, EVENT_MS, NOPE_WINDOW_MS, QUIP_MS } from "./constants";

/**
 * Everything in the game that happens on a timer rather than a tap:
 * bots making their moves, explosions staying on screen, and the No Way window
 * closing. The engine itself has no notion of time.
 */
export function useGameClock(state: GameState, setState: Dispatch<SetStateAction<GameState>>) {
  // Once no person is left in the game, nobody needs to follow each move closely.
  const pace = state.players.some((p) => p.isHuman && p.alive) ? 1 : 0.35;
  const showingEvent = state.event !== null;
  // A person's own explosion gets the full moment even though they're out by then.
  const eventIsPersons = state.players.some((p) => p.id === state.event?.playerId && p.isHuman);
  const bot = activeBot(state);
  const phaseType = state.phase.type;

  // Bots move one step at a time so you can watch them. They wait while an explosion is on screen.
  useEffect(() => {
    if (bot === null || showingEvent) return;
    const delay = (phaseType === "nopeWindow" ? BOT_NOPE_MS : BOT_MOVE_MS) * pace;
    const t = setTimeout(() => setState((s) => botStep(s)), delay);
    return () => clearTimeout(t);
  }, [state, bot, showingEvent, phaseType, setState, pace]);

  // Explosions and extinguishings get a moment on screen.
  useEffect(() => {
    if (!state.event) return;
    const t = setTimeout(() => setState((s) => clearEvent(s)), EVENT_MS * (eventIsPersons ? 1 : pace));
    return () => clearTimeout(t);
  }, [state.event, setState, pace, eventIsPersons]);

  // Speech bubbles fade on their own; forget the quip once they have.
  const quipId = state.quip?.id;
  useEffect(() => {
    if (quipId === undefined) return;
    const t = setTimeout(() => setState((s) => clearQuip(s)), QUIP_MS);
    return () => clearTimeout(t);
  }, [quipId, setState]);

  // Once only people are left deciding, the No Way window times out.
  const humansDeciding = phaseType === "nopeWindow" && bot === null;
  useEffect(() => {
    if (!humansDeciding) return;
    const t = setTimeout(() => setState((s) => letItHappen(s)), NOPE_WINDOW_MS[state.mode]);
    return () => clearTimeout(t);
  }, [humansDeciding, state.mode, setState]);
}
