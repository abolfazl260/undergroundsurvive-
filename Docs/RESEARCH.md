# Research tree

The version 1 graph contains six working technologies in two branches (energy
and agriculture). Each defines fa/en names, cost in existing coins, duration,
laboratory level, prerequisites and a typed production modifier. Topological
validation rejects cycles, missing prerequisites, duplicate/invalid IDs and
invalid costs, times or effects. No unimplemented robot or combat unlock is
advertised as functional.

A 2×1 underground laboratory costs 200 coins and consumes 2 power each resource
tick. Start uses `ResearchFacilityProvider`, validates the entire operation and
charges the existing wallet once. Only one research is active. Buttons show cost,
duration, prerequisites, lab level and effect before explicit payment confirmation.
Research is in the shelter actions sheet; it follows the same responsive touch UI
and locale direction. Completed technology status and a completion message provide
feedback. Effects aggregate deterministically from IDs, never mutate base rates,
and are applied to real generator/garden production (rounded down to integer units).

The injected monotonic simulation clock is the shared resource tick clock. Pause,
offline time and wall-clock changes do not grant credit. Losing the lab or its
power suspends remaining time; rebuilding or restoring power resumes it.
Game schema 6 persists graph version, unlocked IDs, active ID, start/complete times,
clock and operation IDs. Old saves retain resources, achievements and water; their
research clock starts at existing simulation time. Reload/upgrade never stacks an
effect twice. Online implementation must validate costs, inventory version,
operation IDs and timestamps server-side; local saves are not anti-cheat.

Validation covers graph errors, facility/fund/prerequisite rejection, single payment,
concurrency, pause, reload, clock regression, actual production, upgrade and legacy
migration. Screenshot limitation remains as documented in WATER.md.
