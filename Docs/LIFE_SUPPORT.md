# Life support (Issue #30)

The implementation uses the existing 5-second economy tick and the existing clean-water processor as the authoritative stock. A per-room allocation ledger records the **location** of that stock, not a second balance. Water-production ledger entries carry the originating room ID; on migration, pre-existing unallocated water is allocated to a valid tank or treatment room. Kitchen and other pre-existing water debits are reconciled once per tick. Oxygen has a single service-owned stock backed by physical room-held lots. Splitting a network does not magically transfer stored units between zones.

## Boundaries and integrations

The five-second economy cycle in `GameSession.advanceTime` is the **only** clock. The existing `WaterProductionProcessor` remains the sole source of truth for clean water, water extraction, production, inventories, and storage capacity. The existing `AirSystem` remains the sole authority for vent power and air quality. `LifeSupportService` owns a separate oxygen balance, derived from actual powered ventilation units; it never debits ventilation power a second time. Each tick proceeds in this order: economy, clean-water production, kitchen, research, air/ventilation, life support, radiation.

The network models built-in side-facing pipe/duct fittings between adjacent rooms. Each fitting is represented as an explicit edge, and a player-operated isolation valve can open or close it from the water panel. Solid rock, vertically separated rooms, and disconnected rooms are never implicitly linked. `LifeSupportGraph` has no dependency on the power feature branch and is recomputed on room edits.

## Rules (balancing config is versioned in `LIFE_SUPPORT_CONFIG`)

- 30 base oxygen units plus 25 per storage-room level. One active ventilation-room level produces up to three oxygen units per tick, limited by capacity. Water remains limited by the existing processor capacity.
- Each survivor consumes one clean-water unit and one oxygen unit per tick once emergency supplies expire. Demand is assigned to habitat room capacity in deterministic ID order; any remaining residents are assigned once to the first room. This does **not** charge per habitat *and* per resident.
- Medbays consume one unit of each per room level; hydroponics consume one water unit per level. The order is vital residents, medical care, then gardening; ties use ID order. A consumer needing both resources is debited atomically.
- A consumer can use a resource only when its graph component has an applicable distribution facility (water treatment or storage for water; ventilation or storage for oxygen). Cutting a valve isolates that consumer. Each adjacent fitting transmits up to eight water units and eight oxygen units per five-second tick per minimum adjacent room level; separate flow ledgers are consumed deterministically, and a failed multi-resource delivery reserves neither. Existing storages are the tank roles for both resources; no new art or construction types were added.
- A 36-tick migration/emergency grace period permits existing v13 (and fresh) saves to gain production before survivor needs begin. Shortages generate typed `life-support-shortage` and `survivor-exposure` records but do **not** change resident health or kill residents.
- HUD shows water/oxygen stocks, capacity, and rates; water panel shows connection valves and actionable status. All status text is descriptive rather than using color alone.
- The snapshot migrates game schema v13/v15 → v16 and preserves all pre-existing resources, rooms, and coins. Corrupt life-support snapshots are rejected. Paused games do not tick.

## Operational boundaries

The network has explicit physical side-fitting edges, separate water/oxygen per-tick flow capacity, deterministic shortage priorities, and per-room zone inventories. It does not simulate hydraulic pressure or atmospheric mixing. The 36-cycle legacy grace period prevents an unrecoverable sudden shortage on existing saves.

## Tests

`cd game && npm test && npm run build`

The life-support suite verifies deterministic graph edges, valves, demand order, initial grace, resource accounting, partial isolation, bounded pipe and duct throughput, atomic debits, storage capacity and snapshot migration. Full CI must pass before merging.
