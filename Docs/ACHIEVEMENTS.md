# Achievement system

Independent feature under game/src/modules/achievements/.

Achievements award **one-time coins** through the game's existing wallet. All eleven rewards are catalog-defined positive integers, displayed on the card before unlock, and marked received after payment.

## Milestones

| Metric from authoritative game state | Targets |
| --- | --- |
| Successful paid room builds | 1, 5 |
| Successful paid excavations | 1, 10 |
| Successful room upgrades | 1, 3 |
| Unlocked upper floors | 1, 2 |
| Completed active-play resource cycles | 5, 25 |
| Distinct currently owned room types | 6 |

Failed actions do not count. Starter rooms and excavated starter cells do not count as user construction or excavation. Unlocked badges remain earned even when a built room is demolished. Production cycles only advance in active gameplay.

## Persistence and compatibility

GameSession now persists **schema version 14** with nested achievement **schema version 2**. The achievement state stores both unlocked IDs and `rewardGrantedAchievementIds`. Each credit is also an `achievement-reward` entry in the existing wallet transaction log, keyed by the stable achievement ID. The wallet refuses duplicate credits, non-positive/unsafe amounts, and overflow. On v14 restore, the set of granted IDs must match the log (including catalog amounts), or the corrupt save is rejected.

Prior v2–v13 snapshots and layout-only v1 saves remain supported. On the first load of a legacy save, any already-unlocked or reconstructable milestones are credited **once**, then the paired wallet/achievement snapshot is saved in a single JSON localStorage write. If saving fails, the prior save remains unchanged; on next launch the migration replays from that unchanged starting balance, not on top of an unpersisted payment. Fresh games clear progress and rewards.

The Achievements action opens an accessible native dialog with progress bars, per-card coin rewards and a live payment toast. Existing saved payments never replay notifications after reload. Its layout is mobile-first and language-specific strings are available in Persian and English.

## Test commands

From the game directory, run: npm test, then npm run build. The achievement suite tests command success/failure, migration, persistence, reset, resource progress, and malformed data.

## Vault-styled achievements screen

The achievements modal uses the same full-screen mobile-first visual design on the web and mobile. It features an illustrated header, overall completion meter, category filters, localized milestone details, accessible progress elements, and unlocked-state medals. Larger screens arrange filters beside the cards; narrow screens make them a horizontal, touch-friendly strip. The list scrolls inside the modal without moving the game canvas.

Categories are presentation-only: construction (builds, digs, upgrades), exploration (upper floors), production (resource cycles), and community (distinct room types). Their totals are derived from the existing 11 achievement definitions. Badge IDs, unlock rules, and artwork stay unchanged; game economy and save schema incorporate the reward feature. Card artwork reuses the already packaged HD room atlases; no additional downloaded artwork is required.

Dialog Escape and close-button behavior, the existing unlock toast, RTL Persian/LTR English layouts, and local-save progress are preserved. The display also supports reduced-motion preferences.

## Individual full-color WebP artwork

All eleven achievements have their own **two independent WebP files** (360×120 and 540×180) in
`game/public/assets/achievements/`, named by the stable achievement ID:
`first-room-360.webp`, `first-room-540.webp`, `builder-360.webp`, etc.
These are derived from the cinematic bunker illustrations created for this game.
The original panoramic source sheet is archived outside of the public directory
at `game/artwork-sources/milestone-scenes-hd.webp` and is **not loaded by the game**.
The shared SVG and runtime sprite-sheet rendering are not used.

The `achievementsUi.ts` dialog uses `<img>` with `srcset`, `sizes`,
`loading="lazy"`, `decoding="async"`, and an intrinsic 3:1 aspect ratio.
No achievements imagery is fetched at startup; it is inserted only on dialog open.
The list reuses existing card nodes and image elements across regular game-state updates.
Filter changes and language changes rebuild only the affected list.
Locked and unlocked achievements use identical **full-color** artwork; progress, border,
medal and status communicate completion.

Generated artwork totals about 180 KiB for 22 files in the current set (subject to
future source changes). Run `python3 game/scripts/prepare-achievement-webp.py` from
the repository root after installing Pillow when artwork changes, then commit the
resulting individual WebPs. The original sprite source is retained only for
reproducible authoring, not as a served asset. Run
`node game/scripts/check-achievement-webp.mjs` to verify file presence,
WebP validity, uniqueness and the asset-size budget. This check also runs in web CI.

No achievement rule, badge ID, or artwork file changes.


## Asset URLs on GitHub Pages

The WebP files are present in `game/public/assets/achievements/`; a browser
404 for `https://<account>.github.io/assets/achievements/*.webp` is caused by
the missing project path, not by missing artwork.

`achievementArtPaths()` now prefixes **both** `src` and `srcset` values
with Vite's `import.meta.env.BASE_URL` through the shared `assetUrl()` helper.
This works with `base: './'` (relative project-site URLs) and also with
explicit bases such as `/undergroundsurvive-/` or `/`. The browser requests
`/undergroundsurvive-/assets/achievements/*.webp` when the game is served from
that project URL. The existing preloaded room images and WebP files are unchanged.

Regression tests cover local root hosting, relative hosting, explicit project
subpaths, both resolution variants, and every achievement ID.

## Coin rewards (issue #80)

| Achievement | Coins |
| --- | ---: |
| first-room | 40 |
| builder | 150 |
| first-dig | 25 |
| excavator | 160 |
| first-upgrade | 30 |
| upgrader | 75 |
| upper-floor | 100 |
| skyline | 220 |
| first-cycles | 60 |
| steady-shelter | 140 |
| diverse-shelter | 180 |

Amounts are managed in `game/src/modules/achievements/achievements.ts`; change that catalog for balancing, never the dialog. Unlocks and payments are settled by `GameSession` on successful actions, resource-cycle completion, snapshot reconciliation, and restoration, irrespective of whether the achievement screen is open. Overflow leaves a reward pending; it is never marked granted before a successful wallet credit. The HUD and recent transaction list consume the updated wallet snapshot. The toast shows newly posted wallet credits, not changes detected while filtering or reopening the dialog.
