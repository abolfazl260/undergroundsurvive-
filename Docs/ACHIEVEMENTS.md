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
