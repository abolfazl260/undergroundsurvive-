# Achievement system

Independent feature under game/src/modules/achievements/.

Achievements award cosmetic badges only, not currency or resources.

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

GameSession uses snapshot schema version 4 with a nested version-1 achievements state containing unlocked badge IDs. Existing v2 and v3 snapshots and layout-only v1 saves are accepted; historical milestones are reconstructed using existing transactions, floor unlocks, resource tick counts, and room types. Bad v4 achievement payloads with duplicate or unknown IDs fail validation. New games clear badge progress.

The Achievements action opens an accessible native dialog with progress bars and a live unlock notification. Its layout is mobile-first and language-specific strings are available in Persian and English.

## Test commands

From the game directory, run: npm test, then npm run build. The achievement suite tests command success/failure, migration, persistence, reset, resource progress, and malformed data.

## Vault-styled achievements screen

The achievements modal uses the same full-screen mobile-first visual design on the web and mobile. It features an illustrated header, overall completion meter, category filters, localized milestone details, accessible progress elements, and unlocked-state medals. Larger screens arrange filters beside the cards; narrow screens make them a horizontal, touch-friendly strip. The list scrolls inside the modal without moving the game canvas.

Categories are presentation-only: construction (builds, digs, upgrades), exploration (upper floors), production (resource cycles), and community (distinct room types). Their totals are derived from the existing 11 achievement definitions. No badge ID, unlock rule, save schema, reward or economy value is modified. Card artwork reuses the already packaged HD room atlases; no additional downloaded artwork is required.

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

No achievement rule, badge ID, economy field or save-schema value changes.


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
