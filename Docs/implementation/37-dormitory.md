# Dormitory on the current LAST SIGNAL architecture

This implementation starts from main 80e24b2, replacing the closed, unmerged PR #76.
It ports the isolated dormitory model and tests rather than replacing older copies
of GameSession, SurvivorRoster, GameScene, rendering or HUD code.

The stable habitat room type provides 2/4/6 bunk beds and fatigue recovery of
1/1.5/2 per simulation second. Construction adds capacity and never adds a resident.
Admission accepts real externally supplied survivor IDs and a free walkable arrival
cell only while housing capacity is available. Existing over-capacity population is
preserved. Retired IDs cannot be reused to resurrect deleted residents.

BedAssignment gives each resident at most one unique bed slot. RestScheduler uses
the existing exclusive roster jobs, navigation and 50ms simulation steps. Arrival is
required before recovery. It follows the current nonblocking walking policy and
physical elevator state machine, including reduced-motion behavior. Upgrades allow
all bunk-bed slots to be used; no obsolete two-cell collision cap is reintroduced.

Rest uses the live per-room circuit contract (#115), with one unit of available
power required. Cable failure or load shedding suspends recovery while preserving
bed ownership and visit progress. Completing or stopping rest preserves residence;
explicitly releasing a bed removes it. Relocation/deletion and missing survivors
clean up claims without deleting the other residents. The run's existing zero-air
defeat and pause rules freeze simulation and prevent new rest/admission actions.

Fatigue is a bounded 0–100 survivor stat; awake fatigue rises 1/minute. Recovery has
no entry or completion bonus. Reload, repeated commands and early exit cannot create
extra beds or fatigue recovery. All progression uses the existing simulation clock.

GameSnapshot 17 adds dormitory state; roster snapshot 3 adds fatigue and retired IDs.
Versions 2–16 remain supported. Existing power, life-support, kitchen, research, air,
water, radiation, achievement receipts and wallet lifetime counters retain their
current validation and migration paths. Old survivors receive fatigue=50 with no
fabricated bed ownership or offline progress. The real schema-16 fixture was captured
from main 80e24b2 with paid research in progress, physical power settings and live
life-support/water progress. Tests assert exact preservation of these subsystems and
a stable v17 round trip. Invalid fatigue or duplicate bed claims fail validation;
orphan claims are reconciled safely.

The existing bilingual More panel gains housing capacity, occupied/free beds, fatigue,
rest state, and start/stop/release touch actions. Dynamic sprite membership is updated
without replacing the current elevator animation or room rendering. Browser CI uses
the current toolbar/HUD and checks actual rest arrival, recovery and bed release.
