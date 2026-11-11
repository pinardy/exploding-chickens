import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CardSize = "small" | "medium" | "large";
export type BotSpeed = "slow" | "normal" | "fast";

/** How long bots take per move, relative to normal. */
export const BOT_SPEED_PACE: Record<BotSpeed, number> = { slow: 1.6, normal: 1, fast: 0.45 };

export interface Settings {
  cardSize: CardSize;
  reducedMotion: boolean;
  leftHanded: boolean;
  haptics: boolean;
  /** Draw takes two taps, so a stray tap can't end your turn. */
  confirmDraw: boolean;
  botSpeed: BotSpeed;
}

const DEFAULTS: Settings = { cardSize: "medium", reducedMotion: false, leftHanded: false, haptics: true, confirmDraw: false, botSpeed: "normal" };
const KEY = "ec-settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<[Settings, (patch: Partial<Settings>) => void]>([DEFAULTS, () => {}]);

/** Holds the user's preferences, persists them, and mirrors them onto <html> as data attributes for CSS. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    const root = document.documentElement;
    root.dataset.cardSize = settings.cardSize;
    root.dataset.motion = settings.reducedMotion ? "reduced" : "full";
    root.dataset.hand = settings.leftHanded ? "left" : "right";
  }, [settings]);

  return <SettingsContext.Provider value={[settings, update]}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/** Short vibration patterns for the moments that deserve one. No-op where unsupported or turned off. */
export function vibrate(pattern: number | number[], settings: Settings) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
