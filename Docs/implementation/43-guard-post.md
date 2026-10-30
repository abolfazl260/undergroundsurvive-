# Guard post and shared survivor assignments

Stable room type `guardPost`, two underground cells, cost 180 coins. Config v1:
level capacities 1/2/3, health 100/150/200, typed defense multipliers 1/1.15/1.3,
one unit of available power required for readiness. Construction uses existing
placement, support and connected elevator rules. Upgrades use public economy APIs.
The room reuses the existing command-room interior, with its own guard-post badge.

SurvivorRoster owns real survivor IDs and exclusive assignments. ResidentTraffic
owns physical position, current edge and reservations. Both are versioned in save
schema 9, with migration from schemas 2–8. Fixed 50 ms simulation steps preserve
movement across different frame rates. Reload restores an in-progress edge; no
wall-clock progress or fresh rewards occur. Geometry changes and missing posts
release assignments without deleting the survivor. Detached assignments are reconciled.

Defense consumes `DefensePostProvider`, including present/en-route count, power,
readiness, health, level and typed defense bonus. `GuardEquipmentProvider` reads
externally owned inventory; this module manufactures neither equipment nor combat.
Until defense/weapon modules are connected the panel explicitly states readiness
for integration and unavailable equipment. Health changes are accepted via the public
adapter and persisted. No raid, damage algorithm, enemy or spawning is implemented.

The shared mobile panel lists every real survivor, job, arrival state, capacity,
readiness, health and release/assignment actions in both languages. A failed assignment
returns a stable typed reason before mutating reservations. Operation IDs prevent replays.

Validation covers travel before activation, capacity/busy/duplicate rejection, mid-edge
reload, demolition, upgrades, external equipment, power, orphan jobs, unreachable rooms,
old-save migration and deterministic frame partitions. Responsive screenshot CI remains
active. This is the local/offline prototype; a future online authority must own mutations.
