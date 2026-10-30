# Power distribution network (Issue #29)

## Domain and source of truth

The power network is a deterministic TypeScript graph in `game/src/modules/power/network.ts`.
It uses immutable room snapshots from `BuildingLayout` and the excavated/open status from `TerrainMap`; adjacency of room artwork does **not** imply electrical connection.

Every wire occupies one world cell. A room joins a network only if at least one cell of its footprint has a wire. Horizontal neighboring wires form an edge; neighboring vertical wires form an edge **only if each wire is explicitly marked as a riser**. Elevator segments never conduct by themselves. A generator without a cable does not feed consumers. Multi-circuit rooms do not electrically bridge distinct unconnected wire segments. Removing, relocating or demolishing rooms automatically changes the next computed topology; no cached network ID is stored.

The network algorithm computes connected components in fixed cell order and processes rooms in stable priority/room-ID order. Priority defaults to:
- 0 critical: command, medbay
- 1 essential: habitat, hydroponics, kitchen, water treatment, ventilation
- 2 optional: other rooms (including mine and workshop)

Overrides can shift a room by at most one priority tier from its default. They never override physical disconnections. The shed policy is all-or-nothing per room, with no partial electricity debit. If supply is insufficient, low-priority loads are shed deterministically. Batteries are **not** implemented in this MVP.

## Accounting contract

`getRoomPowerFlow` in `game/src/modules/economy/resources.ts` is the shared power recipe adapter for grid allocation and the existing per-room resource tick. There is **no separate power generator, stock ledger, or power debit in the topology module**.

`ResourceEngine.advance` accepts a power allocation calculated from the **same rooms and technology modifiers**. Generator credit and room input debits still happen exclusively in `ResourceEngine.runTick`, once per 5-second cycle. A disconnected or shed room's main resource recipe is skipped before any inputs are spent. Ancillary existing processors (water, cooking, ventilation) retain their own accounting and use the live network's operational room IDs to suspend work when disconnected. The existing global `stock.power` remains a legacy inventory/accounting buffer; it is not modelled as a physically networked battery and does not grant power access to a disconnected consumer.

For a future online version, authoritative balance, wiring, spending and requests should be validated server-side with an operation ID and optimistic base revision. Local browser snapshots are **not** anti-cheat.

## Save migration and controls

Session snapshot schema is now **14**, with `power: { schemaVersion:1, mode, cables, overrides }`.
Older schema versions 2–13 restore into explicit `legacy` virtual-network mode, keeping their former resource behavior. They can add cables while in legacy mode and switch voluntarily to physical mode only after **every room is online** (preventing a save migration from destroying existing shelter utility). Fresh shelters start in physical mode with a seed cable trunk to the original four rooms.

Save validation rejects duplicate wires, wires in blocked cells, out-of-bounds positions, unknown room IDs, duplicate overrides and priority changes outside the permitted tier. Network IDs and allocations are always recomputed rather than saved.

Tools on the shared fullscreen mobile UI:
- **Cable (15 coins):** installs a horizontal conductor on an accessible cell.
- **Vertical connector (35 coins):** adds a riser to the cell; both vertically adjacent cells must contain risers to conduct vertically.
- **Remove cable:** removes a conductor, leaving unrelated network branches untouched.
- **Show grid:** toggles the cable overlay and an explicit X on disconnected/shed rooms.
- **Resource details:** displays grid supply, demand, shortages, room status, priority controls and legacy migration action.

The simulation stops while the scene is paused and does not catch up on offline time.

## Validation

Run from `game`:

```sh
npm ci
npm run test
npm run build
```

Unit and integration tests in `game/src/modules/power/network.test.ts` cover physical separation, cutting/reconnecting, deterministic shortage priority, vertical connectors, save migration, and atomic install cost. Inspect the mobile UI visually before merging. CI must pass and #29's acceptance criteria must be reviewed. This PR must not auto-merge.
