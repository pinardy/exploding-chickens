import { useState } from "react";
import { isMuted, setMuted, unlockAudio } from "../../sounds";
import { useSettings, type CardSize } from "../settings";
import { Modal } from "./Modal";

const SIZES: { value: CardSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

interface GameActions {
  onNewGame: () => void;
  onQuit: () => void;
}

/** Preferences, plus New game / Quit when opened from a game in progress. */
export function SettingsModal({ onClose, game }: { onClose: () => void; game?: GameActions }) {
  const [settings, update] = useSettings();
  const [confirming, setConfirming] = useState<"new" | "quit" | null>(null);

  if (game && confirming) {
    const quitting = confirming === "quit";
    return (
      <Modal title={quitting ? "Quit this game?" : "Start a new game?"}>
        <p>{quitting ? "You’ll go back to the menu and this game will be lost." : "This game will be lost and the cards dealt again with the same players."}</p>
        <div className="buttons">
          <button type="button" className="ghost" onClick={() => setConfirming(null)}>
            Keep playing
          </button>
          <button type="button" className="danger" onClick={quitting ? game.onQuit : game.onNewGame}>
            {quitting ? "Quit game" : "New game"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="setting">
        <span>Card size</span>
        <div className="segmented" role="group" aria-label="Card size">
          {SIZES.map((s) => (
            <button key={s.value} type="button" className={settings.cardSize === s.value ? "" : "off"} onClick={() => update({ cardSize: s.value })}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <Toggle label="Sound" on={!isMuted()} onChange={(v) => { unlockAudio(); setMuted(!v); update({}); }} />
      <Toggle label="Vibration" hint="Explosions and No Way, on phones that support it" on={settings.haptics} onChange={(v) => update({ haptics: v })} />
      <Toggle label="Reduce motion" hint="No card animations or shaking" on={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
      <Toggle label="Left-handed layout" hint="Draw pile and buttons on the left" on={settings.leftHanded} onChange={(v) => update({ leftHanded: v })} />
      <Toggle label="Confirm draws" hint="Tap Draw twice, so a stray tap can’t end your turn" on={settings.confirmDraw} onChange={(v) => update({ confirmDraw: v })} />
      <div className="buttons">
        {game && (
          <>
            <button type="button" className="ghost" onClick={() => setConfirming("quit")}>
              Quit game
            </button>
            <button type="button" className="secondary" onClick={() => setConfirming("new")}>
              New game
            </button>
          </>
        )}
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
