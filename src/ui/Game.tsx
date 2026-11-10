import { useEffect, useRef, useState } from "react";
import {
  activeBot,
  activeHuman,
  alivePlayers,
  canPlay,
  currentPlayer,
  discardCards,
  dismissPeek,
  drawCard,
  giveFavorCard,
  isTurnOf,
  isYou,
  letItHappen,
  needsTarget,
  placeChicken,
  playCards,
  playerById,
  sayNoWay,
  type Card,
  type GameSetup,
  type GameState,
} from "../game";
import { unlockAudio } from "../sounds";
import { Boom } from "./Boom";
import { Curtain } from "./Curtain";
import { GameOver } from "./GameOver";
import { Hand } from "./Hand";
import { Seats } from "./Seats";
import { Table } from "./Table";
import { NOPE_WINDOW_MS } from "./constants";
import { CardDetailModal } from "./modals/CardDetailModal";
import { DiscardModal } from "./modals/DiscardModal";
import { LogModal, PileModal } from "./modals/HistoryModals";
import { FavorModal } from "./modals/FavorModal";
import { SettingsModal } from "./modals/SettingsModal";
import { NoWayModal } from "./modals/NoWayModal";
import { PeekModal } from "./modals/PeekModal";
import { PlaceChickenModal } from "./modals/PlaceChickenModal";
import { TargetModal } from "./modals/TargetModal";
import { COACH_DONE, COACH_TIPS, advanceCoach, skipCoach, useCoachStep } from "./coach";
import { fastForward } from "./fastForward";
import { clearSavedGame, saveGame } from "./savedGame";
import { useSettings, vibrate } from "./settings";
import { loadStats, recordGame, type Stats } from "./stats";
import { useGameClock } from "./useGameClock";
import { useSfx } from "./useSfx";

/** A second tap on the same card within this long plays it. */
const DOUBLE_TAP_MS = 350;
/** Taps on Draw this soon after your turn starts are ignored: they were meant for whatever was on screen before. */
const DRAW_GUARD_MS = 500;
/** How long "Tap again to draw" stays armed when draws need confirming. */
const DRAW_ARM_MS = 2500;
/** How long the "Your turn" toast stays up. */
const TURN_TOAST_MS = 1300;

interface Props {
  setup: GameSetup;
  initial: GameState;
  initialViewer: number;
  /** Restored from storage: in pass & play, hide the hand until someone claims the phone. */
  resumed: boolean;
  onExit: () => void;
  onNewGame: () => void;
}

export function Game({ setup, initial, initialViewer, resumed, onExit, onNewGame }: Props) {
  const [state, setState] = useState(initial);
  // Whose cards the screen shows. Solo: always player 0. Pass & play: whoever last took the phone.
  const [viewer, setViewer] = useState(initialViewer);
  const [hidden, setHidden] = useState(resumed && initial.mode === "hotseat");
  const [picked, setSelected] = useState<number[]>([]);
  const [choosingTarget, setChoosingTarget] = useState(false);
  const [reading, setReading] = useState<Card | null>(null);
  const [sheet, setSheet] = useState<"settings" | "log" | "pile" | null>(null);
  const [drawArmed, setDrawArmed] = useState(false);
  const [settings] = useSettings();

  const me = state.players[viewer] ?? state.players[0];
  const cur = currentPlayer(state);
  const { phase } = state;
  const hotseat = state.mode === "hotseat";
  const myTurn = isTurnOf(state, me.id);
  const showingEvent = state.event !== null;
  const needsPhone = activeHuman(state);
  const curtainUp = needsPhone !== null && (needsPhone !== viewer || hidden) && !showingEvent;

  useGameClock(state, setState);
  useSfx(state, curtainUp, settings);

  const recorded = useRef(false);
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (state.winner === null || recorded.current) return;
    recorded.current = true;
    recordGame(state.players.length - 1, state.mode === "solo" && state.winner === 0);
    setStats(loadStats());
  }, [state.winner, state.players.length, state.mode]);

  // Keep the game on the device until it's over.
  useEffect(() => {
    if (state.winner !== null) clearSavedGame();
    else saveGame({ setup, state, viewer });
  }, [setup, state, viewer]);

  // Draw becomes live a moment after your turn (or a sheet over it) starts, so a tap aimed at
  // the previous screen doesn't end your turn.
  const canAct = myTurn && !curtainUp && !showingEvent && sheet === null && !choosingTarget;
  const drawReadyAt = useRef(0);
  useEffect(() => {
    if (canAct) drawReadyAt.current = Date.now() + DRAW_GUARD_MS;
    setDrawArmed(false);
  }, [canAct]);
  useEffect(() => {
    if (!drawArmed) return;
    const t = setTimeout(() => setDrawArmed(false), DRAW_ARM_MS);
    return () => clearTimeout(t);
  }, [drawArmed]);

  // Ignore picks that have left the hand (played, stolen, given away) rather than syncing them in an effect.
  const selected = picked.filter((id) => me.hand.some((c) => c.id === id));

  const playable = myTurn && selected.length > 0 ? canPlay(state, me.id, selected) : null;
  const playKind = typeof playable === "string" ? playable : null;

  /** Play `ids` (the selection by default), asking for a target first if the card needs one. */
  const play = (ids: number[] = selected, targetId?: number) => {
    const kind = myTurn && ids.length > 0 ? canPlay(state, me.id, ids) : null;
    if (typeof kind !== "string") return setSelected(ids); // leaves the reason on screen
    if (needsTarget(kind) && targetId === undefined) {
      setSelected(ids);
      return setChoosingTarget(true);
    }
    setChoosingTarget(false);
    setState((s) => playCards(s, me.id, ids, targetId));
    setSelected([]);
  };

  // Double-tap (or swipe up) plays a card straight away. A double-tap on the second card of
  // a selected pair plays the pair.
  const quickPlay = (id: number) => {
    if (!myTurn) return;
    unlockAudio();
    const pair = selected.length === 2 && selected.includes(id) && typeof canPlay(state, me.id, selected) === "string";
    play(pair ? selected : [id]);
  };

  const lastTap = useRef<{ id: number; at: number } | null>(null);
  const toggleCard = (id: number) => {
    if (!myTurn) return;
    unlockAudio();
    const now = Date.now();
    const prev = lastTap.current;
    lastTap.current = { id, at: now };
    if (prev?.id === id && now - prev.at < DOUBLE_TAP_MS) {
      lastTap.current = null;
      return quickPlay(id);
    }
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-2)));
  };

  const draw = () => {
    if (!canAct || Date.now() < drawReadyAt.current) return;
    if (settings.confirmDraw && !drawArmed) return setDrawArmed(true);
    setDrawArmed(false);
    setSelected([]);
    advanceCoach(COACH_DONE);
    setState(drawCard);
  };

  // ---- "Your turn": a toast, a buzz and a glow on the hand when a new turn of yours starts ----
  const turnLogId = [...state.log].reverse().find((l) => l.tone === "turn")?.id ?? null;
  const turnMark = cur.id === me.id && me.alive ? turnLogId : null;
  const [toast, setToast] = useState<number | null>(null);
  useEffect(() => {
    if (turnMark === null) return;
    vibrate(25, settings);
    if (hotseat) return; // the pass-the-phone screen already says so
    setToast(turnMark);
    const t = setTimeout(() => setToast(null), TURN_TOAST_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per new turn, not on settings changes
  }, [turnMark]);

  // ---- first-game tips ----
  const coach = useCoachStep();
  useEffect(() => {
    if (selected.length > 0) advanceCoach(1);
  }, [selected.length]);
  useEffect(() => {
    if (state.lastPlay?.actorId === me.id) advanceCoach(2);
  }, [state.lastPlay, me.id]);
  const showCoach = coach < COACH_DONE && canAct;

  // ---- out of a solo game: watch, skip to the end, or start again ----
  const spectating = state.mode === "solo" && !me.alive && state.winner === null;

  const takePhone = (playerId: number) => {
    setViewer(playerId);
    setHidden(false);
    setSelected([]);
    setChoosingTarget(false);
  };

  if (curtainUp) {
    const reason = phase.type === "favorGive" ? `${playerById(state, phase.toId).name} is asking you for a favor.` : "It’s your turn.";
    return <Curtain player={state.players[needsPhone]} reason={reason} onReveal={() => takePhone(needsPhone)} />;
  }

  const status =
    state.winner !== null ? "Game over" : cur.id === me.id ? (
      <>
        <strong>{isYou(state, me) ? "Your turn" : `${me.name}, your turn`}</strong>
        {state.turnsLeft > 1 ? ` (${state.turnsLeft} left)` : ""}
      </>
    ) : (
      `${cur.name}’s turn`
    );

  return (
    <div className="game">
      <div className="topbar">
        <h1>Exploding Chickens</h1>
        <button type="button" className="gear" aria-label="Settings and game menu" onClick={() => setSheet("settings")}>
          ⚙️
        </button>
        <div className="status">{status}</div>
      </div>

      <Seats
        players={state.players.filter((p) => p.id !== me.id)}
        currentId={cur.id}
        thinkingId={showingEvent ? null : activeBot(state)}
        quip={state.quip}
        lastPlay={state.lastPlay}
      />
      <Table
        state={state}
        viewerId={me.id}
        canDraw={myTurn}
        drawArmed={drawArmed}
        onDraw={draw}
        onShowPile={() => setSheet("pile")}
      />

      {showCoach ? (
        <div className="coach" role="note">
          <div className="coach-step" aria-hidden="true">
            {COACH_TIPS.map((_, i) => (
              <i key={i} className={i === coach ? "on" : ""} />
            ))}
          </div>
          <p>
            <span className="coach-icon">{COACH_TIPS[coach].icon}</span> {COACH_TIPS[coach].text}
          </p>
          <div className="coach-buttons">
            <button type="button" className="ghost" onClick={skipCoach}>
              Skip tips
            </button>
            <button type="button" className="secondary" onClick={() => advanceCoach(coach + 1)}>
              Got it
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="log" aria-live="polite" aria-label="Game log. Tap for the full history." onClick={() => setSheet("log")}>
          {state.log.slice(-10).map((l) => (
            <span key={l.id} className={l.tone}>
              {l.text}
            </span>
          ))}
        </button>
      )}

      {spectating ? (
        <div className="spectating">
          <div className="face">🍗</div>
          <div>
            <b>You’re out!</b>
            <small>
              {alivePlayers(state).length} bots still playing · {state.deck.length} cards left
            </small>
          </div>
          <div className="spectating-buttons">
            <button type="button" onClick={() => setState(fastForward)}>
              Skip to result
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                clearSavedGame();
                onNewGame();
              }}
            >
              New game
            </button>
          </div>
        </div>
      ) : (
        <Hand
          hand={me.hand}
          selected={selected}
          playable={playable}
          canDraw={myTurn}
          drawArmed={drawArmed}
          active={canAct}
          onToggle={toggleCard}
          onQuickPlay={quickPlay}
          onHold={setReading}
          onPlay={() => play()}
          onDraw={draw}
        />
      )}

      {toast !== null && (
        <div key={toast} className="turn-toast" aria-hidden="true">
          Your turn
        </div>
      )}

      {reading && <CardDetailModal card={reading} onClose={() => setReading(null)} />}
      {sheet === "settings" && (
        <SettingsModal
          onClose={() => setSheet(null)}
          game={{
            onNewGame: () => {
              clearSavedGame();
              onNewGame();
            },
            onQuit: () => {
              clearSavedGame();
              onExit();
            },
          }}
        />
      )}
      {sheet === "log" && <LogModal log={state.log} onClose={() => setSheet(null)} />}
      {sheet === "pile" && <PileModal discard={state.discard} onClose={() => setSheet(null)} />}
      {phase.type === "discardDown" && cur.isHuman && (
        <DiscardModal hand={me.hand} count={phase.count} onDiscard={(ids) => setState((s) => discardCards(s, ids))} />
      )}
      {choosingTarget && playKind && (
        <TargetModal kind={playKind} targets={alivePlayers(state).filter((p) => p.id !== me.id)} onPick={(target) => play(selected, target)} onCancel={() => setChoosingTarget(false)} />
      )}
      {phase.type === "peek" && <PeekModal cards={phase.cards} onDone={() => setState(dismissPeek)} />}
      {phase.type === "placeChicken" && !showingEvent && cur.isHuman && (
        <PlaceChickenModal deckSize={state.deck.length} onPlace={(depth) => setState((s) => placeChicken(s, depth))} />
      )}
      {phase.type === "favorGive" && playerById(state, phase.giverId).isHuman && (
        <FavorModal
          askerName={playerById(state, phase.toId).name}
          giverLabel={isYou(state, me) ? "you" : me.name}
          hand={playerById(state, phase.giverId).hand}
          onGive={(cardId) => setState((s) => giveFavorCard(s, cardId))}
        />
      )}
      {phase.type === "nopeWindow" && phase.candidates.some((id) => playerById(state, id).isHuman) && (
        <NoWayModal
          action={phase.action}
          actor={playerById(state, phase.action.actorId)}
          candidates={phase.candidates.map((id) => playerById(state, id)).filter((p) => p.isHuman)}
          viewerId={me.id}
          hotseat={hotseat}
          seconds={NOPE_WINDOW_MS[state.mode] / 1000}
          onNoWay={(id) => setState((s) => sayNoWay(s, id))}
          onLetItHappen={() => setState(letItHappen)}
        />
      )}

      {state.event && <Boom type={state.event.type} player={playerById(state, state.event.playerId)} />}
      {state.winner !== null && !showingEvent && (
        <GameOver state={state} viewerId={me.id} stats={stats} onPlayAgain={onNewGame} onMenu={onExit} />
      )}
    </div>
  );
}
