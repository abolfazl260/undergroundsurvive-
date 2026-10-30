# Recreation and survivor morale

Stable type `recreation`, two underground cells, cost 150. Config v1 defines
capacity 1/2/2 (bounded by physical room slots), 30 seconds per visit and morale
recovery 1/1.5/2 per second. Level 3 improves quality without exceeding room slots.
One power unit is charged atomically on successful reservation; available power
is required for ongoing recreation. Failed or repeated commands never charge.
The lounge reuses the existing habitat art with its own recreation badge.

SurvivorStats is owned by the shared roster. Morale is bounded 0–100, starts at 50
for old saves, and decays by 0.5/minute during other activities. A visit reserves
capacity immediately, but credits only physical presence established before each
50 ms simulation step. Completion/early exit release the reservation and job;
there is no entry/completion lump-sum reward. Power loss suspends visit time.
Demolition, relocation and loss of route release safely. A survivor cannot work
and recreate concurrently. The shared UI shows morale, visit progress, capacity,
quality, reservation cost and arrival/suspension state in both languages.

Room destinations now reserve distinct interior cells, with deeper cells preferred
so the first arrival does not block the next at the doorway. Existing movement and
collision reservations remain authoritative; relocation retargets navigation safely.

Save schema 12 / roster schema 2 preserve simulation clock, stats, visit progress,
current movement and operation IDs. Old saves migrate without simulating offline time.
Clock mismatches, invalid morale and malformed visit durations are rejected. Reload
replays no rewards; modifiers and recovery remain derived from current room config.

Tests cover no pre-arrival reward, double commands and costs, capacity/unique jobs,
actual two-person arrival, early exit/re-entry, power loss, demolition, upgrades,
morale cap, repeated reload, legacy migration and frame partition invariance.
