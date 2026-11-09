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
import { FavorModal } from "./modals/FavorModal";
import { SettingsModal } from "./modals/SettingsModal";
import { NoWayModal } from "./modals/NoWayModal";
import { PeekModal } from "./modals/PeekModal";
import { PlaceChickenModal } from "./modals/PlaceChickenModal";
import { TargetModal } from "./modals/TargetModal";
import { useSettings } from "./settings";
import { recordGame } from "./stats";
import { useGameClock } from "./useGameClock";
import { useSfx } from "./useSfx";

export function Game({ initial, onRestart }: { initial: GameState; onRestart: () => void }) {
  const [state, setState] = useState(initial);
  // Whose cards the screen shows. Solo: always player 0. Pass & play: whoever last took the phone.
  const [viewer, setViewer] = useState(0);
  const [picked, setSelected] = useState<number[]>([]);
  const [choosingTarget, setChoosingTarget] = useState(false);
  const [reading, setReading] = useState<Card | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings] = useSettings();

  const me = state.players[viewer];
  const cur = currentPlayer(state);
  const { phase } = state;
  const hotseat = state.mode === "hotseat";
  const myTurn = isTurnOf(state, me.id);
  const showingEvent = state.event !== null;
  const needsPhone = activeHuman(state);
  const curtainUp = needsPhone !== null && needsPhone !== viewer && !showingEvent;

  useGameClock(state, setState);
  useSfx(state, curtainUp, settings);

  const recorded = useRef(false);
  useEffect(() => {
    if (state.winner === null || recorded.current) return;
    recorded.current = true;
    recordGame(state.players.length - 1, state.mode === "solo" && state.winner === 0);
  }, [state.winner, state.players.length, state.mode]);

  // Ignore picks that have left the hand (played, stolen, given away) rather than syncing them in an effect.
  const selected = picked.filter((id) => me.hand.some((c) => c.id === id));

  const playable = myTurn && selected.length > 0 ? canPlay(state, me.id, selected) : null;
  const playKind = typeof playable === "string" ? playable : null;

  const toggleCard = (id: number) => {
    if (!myTurn) return;
    unlockAudio();
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-2)));
  };

  const play = (targetId?: number) => {
    if (!playKind) return;
    if (needsTarget(playKind) && targetId === undefined) return setChoosingTarget(true);
    setChoosingTarget(false);
    setState((s) => playCards(s, me.id, selected, targetId));
    setSelected([]);
  };

  const draw = () => setState(drawCard);

  const takePhone = (playerId: number) => {
    setViewer(playerId);
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
        <button type="button" className="gear" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          ⚙️
        </button>
        <div className="status">{status}</div>
      </div>

      <Seats
        players={state.players.filter((p) => p.id !== me.id)}
        currentId={cur.id}
        thinkingId={showingEvent ? null : activeBot(state)}
        quip={state.quip}
      />
      <Table state={state} canDraw={myTurn} onDraw={draw} />

      <div className="log" aria-live="polite">
        {state.log.slice(-10).map((l) => (
          <div key={l.id} className={l.tone}>
            {l.text}
          </div>
        ))}
      </div>

      <Hand
        hand={me.hand}
        selected={selected}
        playable={playable}
        canDraw={myTurn}
        onToggle={toggleCard}
        onHold={setReading}
        onPlay={() => play()}
        onDraw={draw}
      />

      {reading && <CardDetailModal card={reading} onClose={() => setReading(null)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {phase.type === "discardDown" && cur.isHuman && (
        <DiscardModal hand={me.hand} count={phase.count} onDiscard={(ids) => setState((s) => discardCards(s, ids))} />
      )}
      {choosingTarget && playKind && (
        <TargetModal kind={playKind} targets={alivePlayers(state).filter((p) => p.id !== me.id)} onPick={play} onCancel={() => setChoosingTarget(false)} />
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
        <GameOver winner={playerById(state, state.winner)} isYou={isYou(state, me) && state.winner === me.id} onRestart={onRestart} />
      )}
    </div>
  );
}
