# Exploding Chickens

A card game in React + TypeScript. Draw cards, avoid the Exploding Chicken, make everyone else draw it.

Two modes:
- **Solo vs bots** — you against 1–5 computer players at three difficulty levels. Chick plays at random; Hen peeks, dodges and grabs cards; Rooster remembers the top of the pile, counts Extinguishers and aims chickens at whoever looks exposed. Against a basic "dodge when exposed" player they lose 71% / 37% / 24% of games.
- **Pass & play** — 2–6 people on one phone, each with a name and avatar. A "pass the phone" curtain hides the table between turns, so only the person holding the device sees their hand.

Variants (both modes): **Expansion cards** (seven extra cards, below), **Quick game** (smaller deck, 4-card hands) and **Hand limit 8** (draw over it and you discard down). Tables of 5–6 deal 5-card hands so the pile stays worth drawing from. The start screen keeps a tally of games played and chickens exploded on this device.

Also: cards deal, land and bump; Peek flips its cards one at a time; press and hold any card to read its full rules text; bots wobble while thinking and have speech bubbles with their own personalities; the phone vibrates on explosions and No Way; and a settings sheet (⚙️) with card size, sound, vibration, reduced motion and a left-handed layout. Settings persist in localStorage.

## Install as an app

The page is a PWA: `public/manifest.webmanifest`, icons in `public/icons/`, and a small service worker (`public/sw.js`) that caches the shell for offline play. Serve `dist/` from any static host and use the browser's install / "Add to Home Screen" option. `scripts/inline-pwa.mjs` runs after the build and inlines the manifest and icons as data URIs so the single `dist/index.html` is installable even when hosted alone (iOS Add to Home Screen, Chrome install); the service worker only registers when `sw.js` is actually served beside it.

## Run it

```bash
npm install
npm run dev      # local dev server
npm test         # fuzzes the engine: 400 random games across both modes, invariants checked every step
npm run build    # type-checks, then bundles to dist/index.html (one self-contained file)
```

## Layout

```
src/
  game/            the engine — plain TypeScript, no React, no timers
    cards.ts       card catalog, deck recipe, PlayKind
    state.ts       GameState and friends, newGame, shared helpers
    rules.ts       every state transition: draw, play, No Way, favor, placement
    bot.ts         every decision a computer player makes; difficulty profiles and quips
    narrate.ts     every line the log can say
    sim.test.ts    the fuzz test
  ui/
    Game.tsx       composes the screen; owns viewer / selection state
    useGameClock   bot pacing, event timing, No Way timeout (all setTimeouts live here)
    useSfx         engine cues → sounds
    settings.tsx   persisted preferences (card size, motion, handedness, haptics) → data attributes on <html>
    Start, Curtain, Seats, Table, Hand, Boom, GameOver, CardView, Logo
    modals/        Peek, PlaceChicken, Favor, NoWay, Target, Discard, CardDetail, Settings
  public/          manifest, icons, service worker
  scripts/         inline-pwa.mjs (post-build)
  sounds.ts        Web Audio synthesis for each cue; mute setting in localStorage
  styles.css
```

### Design rules worth keeping

- **Rules are pure.** Every exported function in `rules.ts` is `state in → new state out`; the input is never mutated. That's what makes the fuzz test possible.
- **Choices are phases, not branches.** Where to put a defused chicken, which card to hand over, whether to say No Way: the engine exposes these as `Phase` values and the same functions (`placeChicken`, `giveFavorCard`, `sayNoWay`) serve people and bots alike. `rules.ts` never asks "is this a bot?".
- **Bots act on a clock.** `activeBot(state)` says which bot needs to decide; `useGameClock` calls `botStep` after a short delay so each move is visible. `activeHuman(state)` is the mirror image and drives the pass-the-phone curtain.
- **The engine signals, the UI shows.** `state.event` (a full-screen moment) and `state.sfx` (a sound cue) carry fresh ids so the UI reacts exactly once; the engine never touches the DOM or audio.
- **Log copy lives in one file.** `narrate.ts` handles the "you" vs name wording, and keeps card names out of the log in pass & play so the next player can't read them.

## Cards

| Card | Count | Effect |
|---|---|---|
| Exploding Chicken | players − 1 | Draw it without an Extinguisher and you're out |
| Extinguisher | 6 (1 dealt to each player) | Puts out a chicken; you choose where it goes back in the pile |
| Skip | 4 | End your turn without drawing |
| Double Peck | 4 | End your turn; next player takes 2 turns (stacks) |
| Coop Shuffle | 4 | Shuffle the pile |
| Peek | 5 | See the top 3 cards |
| Favor | 4 | A chosen player gives you a card of their choice |
| No Way | 5 | Cancel another player's action card (timed window) |
| Reverse | 4 | End your turn without drawing and flip the turn order |
| Hen / Rooster / Chick / Egg | 4 each | Play a matching pair to steal a random card |

Quick game uses 3 / 3 / 2 / 3 / 2 / 3 / 3-each and one spare Extinguisher.

### Expansion

| Card | Count | Effect |
|---|---|---|
| Great Escape | 3 | End your turn without drawing, even with stacked turns owed |
| Bottom Feeder | 4 | End your turn by drawing from the bottom of the pile |
| Careful Peck | 4 | End your turn by drawing the first non-chicken card; if they're all chickens, skip |
| Fox in the Henhouse | 2 | Destroy all of a chosen player's Favor and plain chicken cards |
| Coop Scramble | 2 | Pool everyone's hands, shuffle, deal back the same counts |
| Hot Chicken | 1 | Can't be played. Draw a chicken while holding it and the chicken is tossed to the next player, who must deal with it |

The mechanics of Reverse and the expansion are borrowed from the hosted game at chickens.rakerman.com; names, art and code here are original.

Ideas not built yet: three-of-a-kind to name a card, counter-No-Way chains, player names and avatars in pass & play, save and resume, online multiplayer.
