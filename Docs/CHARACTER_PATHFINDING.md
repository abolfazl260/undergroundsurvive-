# Character movement and navigation

Residents retain automatic patrol and manual "Navigate (مسیریابی آدمک)" commands:
select a resident and tap a reachable destination room. The selected resident's
ring remains visible, but **the route line and route markers are not rendered**.

## Navigation constraints

- `characters/pathfinding.ts` finds a route only over connected, physically
  walkable cells inside the world bounds. Ground must be excavated as required,
  and upper-floor cells require an actual built floor.
- Vertical movement is possible only through adjacent segments of a connected
  elevator shaft. Doors, boarding, travel, and exiting remain animated.
- A single physical elevator cabin serves a shaft. Only one passenger rides
  that cabin at a time; others wait for the lift, not for pedestrians.
- Moving into an inaccessible room or across invalid terrain still fails.
  Construction, excavation, demolition, and other layout changes revalidate
  movement goals.

## Resident-to-resident interaction

- Residents have **no physical collision with each other**. More than one
  resident may occupy or target the same cell, share a room cell, and cross in
  opposite directions through a narrow corridor. Neither the current cell
  nor an interpolated next step reserves space against another pedestrian.
- Walking never waits or reroutes to avoid another resident. Waiting occurs only
  for an elevator cabin when it is already carrying a passenger.
- The traffic snapshot schema remains at version 1. Restoring old snapshots
  still validates destinations, world geometry, steps and elevator phases,
  but accepts overlapping resident positions and in-flight steps.
- Reduced-motion mode still advances a traversable step at a time and uses the
  elevator state machine. Pausing the game stops the simulation.

## Tests

Run `cd game && npm test && npm run build`. Tests cover crossing a stationary
pedestrian, opposing movement, shared spawn/save cells, normal multi-resident
navigation, boundaries, building changes, elevator exclusivity, and reduced motion.
