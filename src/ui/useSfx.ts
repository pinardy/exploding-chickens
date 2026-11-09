import { useEffect } from "react";
import type { GameState } from "../game";
import { play } from "../sounds";
import { vibrate, type Settings } from "./settings";

/** Turns engine cues and a few UI moments into sounds and vibration. */
export function useSfx(state: GameState, curtainUp: boolean, settings: Settings) {
  const cue = state.sfx;
  useEffect(() => {
    if (!cue) return;
    play(cue.name);
    if (cue.name === "boom") vibrate([90, 50, 180], settings);
    else if (cue.name === "buzz") vibrate(60, settings);
    else if (cue.name === "defuse") vibrate([30, 40, 30], settings);
  }, [cue?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- one play per cue id

  const gameOverShown = state.winner !== null && state.event === null;
  useEffect(() => {
    if (gameOverShown) play("fanfare");
  }, [gameOverShown]);

  useEffect(() => {
    if (curtainUp) play("pass");
  }, [curtainUp]);
}
