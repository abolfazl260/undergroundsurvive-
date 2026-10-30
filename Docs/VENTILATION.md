# Air quality & ventilation — Issue #35

## Design and balancing

The ventilation room uses the stable `typeId: ventilation` in the existing building catalog.
It is 2 × 1 underground cells, costs 200 coins, and follows the existing placement,
elevator access, movement, demolition, economy and level-1-to-3 upgrade commands.
No new above-ground construction is enabled. Equipment visuals use a lightweight
Phaser fan symbol; the UI is a mobile-first card within the existing More sheet.

`game/src/modules/air/air.ts` holds the **versioned balance config**, pure
`simulateAir(dt, population, emissions, vents, power)` function, optional
`AirEmissionsAdapter`, and `AirSystem` processor. Quality is 0–100 points,
starts at 100, is clamped/rounded to 2 decimals, and is measured shelter-wide
(the room/location zoning adapter is deliberately reserved for future expansion).

Every active 5-second resource tick:

1. The regular resource engine resolves production/consumption, then the water
   processor spends its share of power.
2. Air equipment receives the **remaining** power budget. Running units are
   selected by stable room ID order; they consume 1/2/3 power for levels 1/2/3.
   No unit is credited with cleaning unless its power is actually debited.
3. Powered units provide level-based nominal coverage 5/8/11 residents,
   scaled by equipment health, and purification proportional to level/health.
4. A small background decay, resident load, all active rooms, industrial
   mine/workshop emissions and uncovered population reduce air quality.
   Additional vents contribute once each; quality can never exceed 100.
5. A powered vent incurs 0.01% wear per tick. Each may be disabled/re-enabled.
   The repair command costs 60 coins and uses wallet transactions. Operation IDs
   protect toggles, damage events and repairs against duplicate execution.

Thresholds: healthy ≥75, warning 40–74.99, critical <40. HUD and panel display
state, coverage, powered devices and the immediate reason for deterioration.
`airModifiers()` provides configurable efficiency/welfare projections but does
**not** mutate survivor health or production at this stage, preventing
undocumented instant penalties. Further integrations must explicitly opt in
through that adapter. Events can call `damage(id, amount, operationId)`.

## Pause, offline and saves

The system uses the same monotonic resource tick clock. Paused scenes do not
advance it; no wall-clock catch-up or offline farming occurs. The session
snapshot schema is **v13**, holding the entire atmosphere state including
equipment health/enabled status and deduplication ledger. Saves v2–v12 migrate
at their saved tick count with quality 100 and no retroactive power consumption.
Saves v13 validate fields and require the air timestamp to equal the resource
clock. Moving/re-upgrading a vent preserves health and enabled state; demolition
discards its state.

## Verification

Run locally: `cd game && npm ci && npm run test && npm run build`.

Unit/integration cases are in `src/modules/air/air.test.ts`. They cover
adequate capacity, overload, power outage, extra units, deterministic unit order,
quality caps, idempotent commands, save migration, replay and time partitioning.
