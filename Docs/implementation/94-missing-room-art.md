# Issue #94 — Dedicated Level 1 room artwork

## Implemented
- Four independent, consistent industrial cutaway interiors with no people, baked-in names or redundant colored borders.
- Real, source-derived WebP atlas for kitchen, recreation, guard post and ventilation.
- **Atlas layout:** 2 columns × 2 rows, row-major frames: kitchen (0), recreation (1), guardPost (2), ventilation (3).
- **1×:** 320×106 px atlas, 160×53 px per frame.
- **HD 3.5×:** 1120×372 px atlas, 560×186 px per frame.
- Registered in `roomArt.ts` and preloaded by `GameScene`. Distinct Level 1 art is preferred; existing Level 2 artwork still has highest priority.
- Ventilation status overlay, nameplate and corridor paint remain unchanged. Failed image requests keep the safe placeholder.

## Verification
- `cd game && npm test && npm run build`.
- Confirm correct mapping, real WebP dimensions, the existing five first Level 2 frames and nine other new Level 2 frames.
- Inspect 75%, 100%, 250% zoom, mobile portrait/landscape and desktop.
- No gameplay, economy, persistence, character navigation or room footprint changes.

Artwork: original, high-resolution bunker-room images, not enlarged from the low-resolution spritesheet.
