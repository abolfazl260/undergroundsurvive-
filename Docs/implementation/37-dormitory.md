# Dormitory beds, population admission and rest

The existing stable `habitat` type is the dormitory; old art and room IDs remain
compatible. DORMITORY_CONFIG v1 defines beds 2/4/6 and fatigue recovery 1/1.5/2 per
second. Construction increases admission capacity by the exact configured amount
and never creates a person. Existing over-capacity residents are preserved. The
public admission adapter validates a stable new ID, a free walkable arrival cell
and total capacity. Deleted survivor IDs are retired to prevent resurrection.

A BedAssignment binds a survivor to one unique room slot. Starting rest allocates
a free bed atomically with the shared exclusive job; a resident cannot work and
rest concurrently. RestScheduler delegates travel and simulation to the shared
roster. Recovery begins only after actual arrival and is bounded at zero fatigue.
Residents retain their home bed after ending or completing rest, until explicitly
released. Rest does not require electricity. The room's collision-safe interior
limits concurrent rest positions to two, independently of bunk-bed ownership.
The panel shows both bed counts and concurrent rest occupancy.

Fatigue is a single 0–100 roster stat. Awake fatigue rises 1/minute; rest reduces
it by room quality per active simulation second. No wall-clock/offline progress,
entry bonus or completion bonus exists. Pause/reload preserves time, assignments,
fatigue and bed ownership. Early exit and repeated commands cannot duplicate beds
or recovery. Room removal/movement releases beds without deleting survivors;
removed survivors and orphan rest jobs are reconciled.

Save schema 14 / roster schema 3. Versioned roster migrations initialize old residents' fatigue without creating
bed claims. Dormitory snapshots validate duplicate slots and owners, then reconcile
missing rooms and survivors. Simulation clocks remain consistent with resources.

The bilingual shared panel includes population versus capacity, excess population,
unhoused residents, free/occupied beds, rest rate, fatigue and touch actions for
start/stop/rest-bed release. Newly admitted/removed people update sprite rendering.
Browser CI captures rest assignment/release and both 100% and 225% scene zoom.

Tests cover admission, no auto-spawn, unique beds, physical arrival, incompatible
jobs, simultaneous rest, room/survivor removal, upgrades, fatigue bounds, reload,
legacy migration, orphan claims and deterministic frame partitions.
