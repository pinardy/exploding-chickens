import { useMemo, type CSSProperties } from "react";
import type { GameEvent, Player } from "../game";

const FEATHER_COUNT = 10;

function scatter(): CSSProperties[] {
  return Array.from({ length: FEATHER_COUNT }, (_, i) => {
    const angle = (i / FEATHER_COUNT) * Math.PI * 2;
    const dist = 120 + Math.random() * 120;
    return { "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist}px`, "--rot": `${Math.random() * 360}deg` } as CSSProperties;
  });
}

/** Full-screen moment for an explosion or an extinguisher save. */
export function Boom({ type, player }: { type: GameEvent["type"]; player: Player }) {
  const feathers = useMemo(scatter, []);
  return (
    <div className={`boom ${type}`} role="status">
      {type === "explode" &&
        feathers.map((style, i) => (
          <span key={i} className="feather" style={style}>
            🪶
          </span>
        ))}
      <div className="big">{type === "explode" ? "💥" : "🧯"}</div>
      <h2>{type === "explode" ? `${player.name} exploded!` : `${player.name} put it out!`}</h2>
    </div>
  );
}
