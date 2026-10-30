# F-04: connected elevator access

Floors are derived from continuous same-column segments rooted at y=0.
The starter has a one-cell shaft at x=0 from 0 through -2. Room footprints
cannot overlap shafts. `canBuildElevator`/`buildElevator` coordinate collision,
construction policy and immutable terrain extension; `GameSession` commits the
150-coin fee and candidate layout together. Ordinary digging cannot open floors.
Only the shaft cell is excavated by an extension; horizontal development remains
separate. Direct floor-unlock APIs always reject. Shaft removal/movement is
explicitly disabled until a safe reconnect policy exists.

The current #28 underground-only policy takes precedence over the historical
above-ground portion of #2: new extension is below zero only. Pure world access
supports positive floors for historical saves and a future explicit policy.
World bounds and geometry are unchanged. The elevator is a separate catalog
structure, not an upgradeable room. UI has touch selection, valid/invalid ghost,
reason label and grid-aligned shaft graphics.

Base snapshot schema 2 includes elevator segments. Restore rejects gaps,
duplicates, collisions, mismatched floor metadata, inaccessible excavations and
missing shaft cells. Schema 1 migration finds a free column across all previously
used floors and preserves rooms. If no column exists, restore returns a controlled
failure. Browser persistence retains an un-restorable original in
`underground-survive:recovery` and the scene displays a recovery warning; it is not
silently destroyed. Online authorization/operation IDs must be server-owned.

Unit/integration regressions exercise atomicity, costs, bypass prevention,
one-floor extension, boundaries, migration and tampered snapshots. Browser visual
verification remains unavailable (see WATER.md).

## Surface blast door and sealed access depth

The surface tile (logical y=0) is a sealed **steel blast exit**, never a visible lift landing. The lift cabin remains underground; the door is drawn on top of the moving car so the exterior stays sealed during quarantine.

The shaft physically spans **two security-only levels** immediately below the surface before reaching the first editable underground row. These two levels are **not construction grid cells**: clicks, room placement, excavation and room movement cannot target them. The shaft is visually continuous through this space, and fractional cabin travel positions are mapped smoothly over the full extra height.

The underlying logical room floors still begin at y=-1, and the saved grid coordinates, economics, pathfinding and elevator connectivity remain unchanged. This avoids relocating or corrupting existing game saves. The portrait viewport remains 480×600 and the extended world is 960×720; only the soil portion of the background extends below its original 960×600 artwork, preserving skyline-to-surface alignment.
