# Issue #94 — Dedicated room interiors

## Implemented in the feature branch
- Four distinct painterly/industrial underground interiors (kitchen, ventilation,
  recreation and guard post), without characters or overlaid labels.
- No shared habitat/command frames for recreation/guardPost.
- A single four-frame WebP atlas with compressed 160×53 and 480×159
  frame variants. Frame order stays fixed: kitchen, ventilation, recreation,
  guardPost.
- `roomArtCandidates` prioritizes the existing special Level 2 kitchen art,
  then the new dedicated Level 1 art. Other room art is unaffected.
- Reuses the existing graphics fallback if WebP assets are unavailable.
- Existing ventilation status text and scene overlays remain intact.

## Quality gate
- Visual design must be reviewed and approved before merging this draft PR.
- Inspect 75%, 100%, and 250% camera zoom; mobile portrait, mobile landscape,
  tablet and desktop screens.
- Run `cd game && npm test && npm run build`.
- Confirm no image duplicate, crop clipping, room-border doubling or text
  baked into the new WebP sheets. Keep the existing Level 2 kitchen frame.

## Scope
No changes to room economics, construction constraints, save states, upgrades
or character movement.

Reference: issue #94. Asset art is original image-generation output,
cropped from finished room panels with the UI labels excluded.
