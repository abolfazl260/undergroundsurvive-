# Character movement and advanced pathfinding

The game spawns **three independently controlled residents** in distinct cells of
the command room. With **Navigate (مسیریابی آدمک)** selected, tap a resident to
select it (gold selection ring), then tap a room to assign that resident a
destination. The selected resident's path is shown while it moves. Residents
patrol independently when their waiting period expires. Labels show their index
and MOVE, WAIT, REST, WORK or IDLE state.

## Walkability and world boundaries

- \`characters/pathfinding.ts\` uses breadth-first search on the world grid and
  returns only connected cells. Both endpoints of every movement edge must be
  inside the grid and physically walkable.
- Underground cells require excavation. Surface cells are solid walkways.
  Unlocking an above-ground floor does **not** create a floating walkway: an
  above-ground cell must actually belong to a built room to be walkable.
- Vertical passages retain the prototype rules: an open, unoccupied shaft or
  the command room's built-in access. Ordinary vertically stacked rooms do
  not provide a ladder or elevator.
- Above-ground rooms without a legitimate vertical access are intentionally
  unreachable until a separate elevator/stair feature is implemented.

## Multi-resident traffic

\`characters/traffic.ts\` handles independent assignments and movement.

- Each resident occupies its current cell and reserves the next cell while
  walking between their centers. A second resident cannot use either cell,
  preventing collisions and head-on swaps even on large frame deltas.
- Agents with disjoint routes move concurrently. A blocked resident tries
  a new shortest route avoiding cells occupied or reserved by other agents.
  If no valid detour exists, it waits; it never crosses a blocked cell.
- Scheduling priority rotates each update to reduce unfair contention.
  Congested single-width passages may still cause waiting or deadlock when
  there is no physical passing space; residents never teleport to resolve it.
- A build, excavation, relocation, floor change or demolition refreshes
  assignments. Removed or disconnected destination rooms cancel the affected
  assignment. An invalid manual destination does not erase an existing goal.
- Reduced-motion mode skips interpolation but still reserves cells and
  advances at most one safe edge per update; pause halts all updates.
- Resident locations and assignments remain session-local (not included
  in existing save data); resetting the game recreates the three residents.
  Worker/economy effects and new construction types are out of scope.

## Tests

Run \`cd game && npm test && npm run build\`. The navigation tests cover
terrain and air restrictions, boundary checks, multiple simultaneous residents,
reserved source/target cells, dynamic detours, changes to the building layout,
invalid commands and reduced-motion updates.
