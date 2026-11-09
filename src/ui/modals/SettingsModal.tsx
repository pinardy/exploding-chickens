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

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, update] = useSettings();
  return (
    <Modal title="Settings">
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
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
