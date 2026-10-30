# Command center and capability gate

`CommandCenterDefinition` version 1 keeps the existing stable `command` type,
3×1 footprint, three levels and shared upgrade pricing. New construction costs
300 coins, requires an accessible excavated underground footprint and is singleton
by configurable catalog policy. The starter still includes one center. Build,
move, removal and upgrades use the shared layout/session commands and wallet.
Command upgrades require power, sufficient coins and explicit UI confirmation;
provided operation IDs persist to prevent a replay from purchasing a second level.

`CapabilityGate` is the one shared gate for new industrial construction. Level 1
provides shelter overview; level 2 grants mine/workshop construction. The level 3
repair-robot entry remains explicitly unimplemented/feature-disabled: it never
becomes an operational permission. Research permissions and completed technologies
are independent. Existing rooms continue operating during command outages.

Earned permissions are monotonic and survive relocation, demolition and reload.
Without an active powered center, new dependent actions are blocked with a reason.
Rebuilding restores use of earned licenses even if the replacement starts at level
1; previous investment is not silently lost. Room level itself follows the normal
building rules. Power requires at least the current level's command consumption.

The bilingual mobile shelter panel reads layout/resource/coin snapshots and the
live resident provider; it owns no duplicate economy or population state. It shows
room/coin/resource/population totals, level, power, every permission's prerequisite
and lock reason, future-feature flags, and upgrade cost before confirmation.

Game snapshot schema 8 persists active room ID, earned permissions and upgrade
operation IDs. Zero-center saves load normally. Historical saves with multiple
centers keep all rooms, select one deterministically and prohibit another new
center; if the active room disappears, another existing center is selected.
Unknown/duplicate permissions or operation IDs are rejected. Old versions migrate
without losing water, research, radiation or achievements.

Tests exercise singleton/underground checks, atomic failed payment, real industry
unlock, duplicate upgrade replay, blackout/recovery, move/demolish/rebuild,
zero/multiple-center saves and malformed state. Browser screenshot verification
remains unavailable as documented in WATER.md. The local client is a prototype;
online commands still require server authorization and operation validation.

The necessary shared UI integration also groups command/lab/water catalog buttons
inside the existing room grid and gives management panels consistent 44px touch
targets, readable cards and room/actions sheet visibility.
