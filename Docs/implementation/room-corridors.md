# Room corridors and frame styling

Only the room visuals changed: remove the redundant bright rounded **per-room colour stroke**. The HD/WebP room artwork already contains its own metal beams and corners.

For each pair of horizontally touching rooms on a shared floor, draw a **single compact steel hatch/passage** across their common wall. The 14 × 32 world-pixel graphic is located inside the two existing shells (no new grid cell), with:
- recessed dark opening, matching metal jambs and rivets;
- tiny amber overhead light and a stepped floor/threshold;
- labels and room status above the connector layer, never obscured.

The corridor generation uses current room footprints, not scene IDs or asset types. It automatically follows new rooms, relocations, and removals. It excludes diagonal/vertical neighbors, empty spaces and rooms still under construction. If multiple rooms contact a multi-floor module, there is one hatch per shared floor.

**No gameplay changes:** pathfinding still uses the previously implemented room adjacency rules, saves are identical, room hitboxes/placement/costs are unchanged, there are no new image requests and no hand-edited SVGs. The graphic is batched into a single Phaser Graphics object per structural redraw for efficient mobile display.

Test with `cd game && npm test && npm run build` and the Room UI visual checks.
