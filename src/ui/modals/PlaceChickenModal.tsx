import { useState } from "react";
import { Modal } from "./Modal";

/** Above this many cards the pile strip shows one stripe per two cards or so; it's a picture, not a count. */
const MAX_STRIPES = 40;

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

function describe(depth: number, deckSize: number): string {
  if (deckSize === 0) return "The pile is empty: it’ll be the only card in it";
  if (depth === 0) return "On top: the very next card drawn";
  if (depth === deckSize) return "At the bottom of the pile";
  return `${ordinal(depth + 1)} from the top, with ${depth} card${depth === 1 ? "" : "s"} above it`;
}

/** Choose how deep in the pile a defused chicken goes back, on a picture of the pile. */
export function PlaceChickenModal({ deckSize, onPlace }: { deckSize: number; onPlace: (depth: number) => void }) {
  const [depth, setDepth] = useState(0);
  const stripes = Math.min(deckSize, MAX_STRIPES);
  // Where the chicken sits among the stripes.
  const at = deckSize === 0 ? 0 : Math.round((depth / deckSize) * stripes);

  return (
    <Modal title="Put the chicken back">
      <p>{deckSize > 0 ? "Slide to choose where it goes. Nobody else will know." : "Nobody else will know where it went."}</p>

      <div className="pilestrip" aria-hidden="true">
        <span className="end">Top</span>
        <div className="stripes">
          {Array.from({ length: stripes + 1 }, (_, i) =>
            i === at ? (
              <i key="chicken" className="chicken">
                <b>🐔</b>
              </i>
            ) : (
              <i key={i} />
            ),
          )}
        </div>
        <span className="end">Bottom</span>
      </div>

      {deckSize > 0 && (
        <input
          className="depth"
          type="range"
          min={0}
          max={deckSize}
          step={1}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          aria-label="How deep to put the chicken"
          aria-valuetext={describe(depth, deckSize)}
        />
      )}
      <p className="depth-label">{describe(depth, deckSize)}</p>

      <div className="buttons">
        {deckSize > 0 && (
          <>
            <button type="button" className="secondary" onClick={() => setDepth(0)}>
              Top
            </button>
            <button type="button" className="secondary" onClick={() => setDepth(Math.floor(Math.random() * (deckSize + 1)))}>
              Random
            </button>
            <button type="button" className="secondary" onClick={() => setDepth(deckSize)}>
              Bottom
            </button>
          </>
        )}
        <button type="button" className="wide" onClick={() => onPlace(depth)}>
          Put it here
        </button>
      </div>
    </Modal>
  );
}
