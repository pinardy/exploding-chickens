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
  needsNamedCard,
  needsTarget,
  placeChicken,
  playCards,
  playerById,
  sayNoWay,
  type Card,
  type CardKind,
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
import { NameCardModal } from "./modals/NameCardModal";
import { TargetModal } from "./modals/TargetModal";
import { COACH_DONE, COACH_TIPS, advanceCoach, skipCoach, useCoachStep } from "./coach";
import { fastForward } from "./fastForward";
import { clearSavedGame, saveGame } from "./savedGame";
import { BOT_SPEED_PACE, useSettings, vibrate } from "./settings";
import { addExplosions, loadStats, recordGame, type Stats } from "./stats";
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
  /** Explosions of this game already in the stats, or null if it hasn't been recorded yet. */
  initialRecorded: number | null;
  /** Restored from storage: in pass & play, hide the hand until someone claims the phone. */
  resumed: boolean;
  onExit: () => void;
  onNewGame: () => void;
}

export function Game({ setup, initial, initialViewer, initialRecorded, resumed, onExit, onNewGame }: Props) {
  const [state, setState] = useState(initial);
  // Whose cards the screen shows. Solo: always player 0. Pass & play: whoever last took the phone.
  const [viewer, setViewer] = useState(initialViewer);
  const [hidden, setHidden] = useState(resumed && initial.mode === "hotseat");
  const [picked, setSelected] = useState<number[]>([]);
  const [choosingTarget, setChoosingTarget] = useState(false);
  /** Three of a kind: the player picked, while choosing which card to ask them for. */
  const [naming, setNaming] = useState<number | null>(null);
  const [openSheet, setSheet] = useState<"settings" | "log" | "pile" | null>(null);
  const [openCard, setReading] = useState<Card | null>(null);
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
  // The game-over screen takes over: a sheet left open under it would keep the app behind it inert.
  const sheet = state.winner !== null ? null : openSheet;
  const reading = state.winner !== null ? null : openCard;

  useGameClock(state, setState, BOT_SPEED_PACE[settings.botSpeed]);
  useSfx(state, curtainUp, settings);

  // ---- lifetime stats ----
  // A game counts as soon as its result for the person is known: at the end, or in solo the moment
  // they're out, so leaving a lost game early still counts as a loss. Explosions that follow are
  // added as they happen. `recorded` is how many explosions are in the stats so far.
  const recorded = useRef(initialRecorded);
  const [stats, setStats] = useState<Stats | null>(() => (initialRecorded === null ? null : loadStats()));
  const explosions = state.outOrder.length;
  const soloPlace = state.mode !== "solo" ? null : state.winner === 0 ? 1 : state.outOrder.includes(0) ? state.players.length - state.outOrder.indexOf(0) : null;
  const resultKnown = state.winner !== null || soloPlace !== null;
  useEffect(() => {
    if (!resultKnown) return;
    if (recorded.current === null) {
      // Out first of six is 6th; the winner is 1st.
      const solo = soloPlace === null ? null : { difficulty: state.difficulty, won: soloPlace === 1, place: soloPlace };
      setStats(recordGame({ explosions, solo }));
    } else if (explosions > recorded.current) {
      setStats(addExplosions(explosions - recorded.current));
    } else {
      return;
    }
    recorded.current = explosions;
  }, [resultKnown, explosions, soloPlace, state.difficulty]);

  // Keep the game on the device until it's over. Declared after the stats effect, so what's saved
  // already says whether this game has been counted.
  useEffect(() => {
    if (state.winner !== null) clearSavedGame();
    else saveGame({ setup, state, viewer, recorded: recorded.current });
  }, [setup, state, viewer]);

  // Draw becomes live a moment after your turn (or a sheet over it) starts, so a tap aimed at
  // the previous screen doesn't end your turn.
  const canAct = myTurn && !curtainUp && !showingEvent && sheet === null && !choosingTarget && naming === null;
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
  const play = (ids: number[] = selected, targetId?: number, named?: CardKind) => {
    const kind = myTurn && ids.length > 0 ? canPlay(state, me.id, ids) : null;
    if (typeof kind !== "string") return setSelected(ids); // leaves the reason on screen
    if (needsTarget(kind) && targetId === undefined) {
      setSelected(ids);
      return setChoosingTarget(true);
    }
    if (needsNamedCard(kind) && named === undefined) {
      setSelected(ids);
      setChoosingTarget(false);
      return setNaming(targetId!);
    }
    setChoosingTarget(false);
    setNaming(null);
    setState((s) => playCards(s, me.id, ids, targetId, named));
    setSelected([]);
    advanceCoach(2); // they've played a card: on to the tip about drawing
  };

  // Double-tap (or swipe up) plays a card straight away. On a card that's part of a selected
  // pair or three of a kind, it plays the whole set.
  const quickPlay = (id: number, sel: number[] = selected) => {
    if (!myTurn) return;
    unlockAudio();
    const set = sel.length >= 2 && sel.includes(id) && typeof canPlay(state, me.id, sel) === "string";
    play(set ? sel : [id]);
  };

  /** The last tap on a card, and the selection as it was just before it. */
  const lastTap = useRef<{ id: number; at: number; before: number[] } | null>(null);
  const toggleCard = (id: number) => {
    if (!myTurn) return;
    unlockAudio();
    const now = Date.now();
    const prev = lastTap.current;
    lastTap.current = { id, at: now, before: selected };
    if (prev?.id === id && now - prev.at < DOUBLE_TAP_MS) {
      lastTap.current = null;
      // The first tap of the pair toggled this card. If that took it out of a selected set,
      // the set the person means is the one from before that tap.
      return quickPlay(id, prev.before.includes(id) ? prev.before : selected);
    }
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-3)));
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
  // Not once there's a winner: the engine points `current` at them without starting a turn.
  const turnMark = cur.id === me.id && me.alive && state.winner === null ? turnLogId : null;
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
      {naming !== null && playKind === "triple" && (
        <NameCardModal
          targetName={playerById(state, naming).name}
          expansion={state.expansion}
          onName={(kind) => play(selected, naming, kind)}
          onCancel={() => setNaming(null)}
        />
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
