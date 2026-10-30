# Water treatment (local prototype)

Catalog type `waterTreatment`, 2×1 underground cells, costs 180 coins; levels 1–3.
`WaterProductionProcessor` owns a version 1 recipe and finite aquifer adapter in
`WATER_CONFIG`. Pumping transfers 10 units from the finite 200-unit source for
1 power, with operation IDs preventing duplicate requests. Initial raw stock is
20 units. No automatic replenishment or offline production occurs.

Every 10 active seconds, a room consumes 2 raw + 2 power and produces 2 × level
clean water. Transactions check full output capacity before spending anything.
The shared 5-second simulation clock determines progress independently of FPS.
Disabled, unpowered, input-starved or full rooms retain progress; upgrade resets
uncharged progress, moving preserves it, demolition discards it. Save schema 5
migrates schemas 2–4 without losing resources or achievements. Water schema 1
persists progress, operation IDs and a bounded production ledger. Capacity loss
keeps water intact and blocks further inflow until space exists.

The existing prototype has no survivor water consumer (demand is zero). Consumers
should use a future water adapter rather than alter scene rendering. Specialist
and research modifiers should extend the versioned recipe provider. The local
simulation is not authoritative: online commands need server transactions and
unique operation IDs.

Validation: unit/integration tests cover exact exchange, missing inputs/power,
full tank, pause, upgrade, demolition, reload, legacy saves and tick partitioning.

Visual evidence limitation: the environment has no installed Chromium, and the
Playwright browser download returned a truncated archive. Automated DOM/mobile
screenshot verification could not run here; UI uses existing responsive sheets.
