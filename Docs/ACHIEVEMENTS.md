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

## Individual milestone illustrations

Each of the eleven achievements has a dedicated panoramic scene in `game/public/assets/achievements/milestone-scenes.svg`, rendered by the presentation layer from a single lightweight sprite sheet. Frame ordering is explicitly defined by `ACHIEVEMENT_ARTWORK` in `game/src/app/achievementsUi.ts`. The scene remains in full color, including before unlocking the achievement; only the border, medal, label and progress meter communicate unlock state.

Achievement cards devote more width to imagery on large screens and use a full-width 3:1 image row on mobile, with no off-screen clipping or grayscale effects. The existing achievement rules, catalog, economy, translations, and save data remain unchanged. Tests assert a distinct frame for every achievement.
