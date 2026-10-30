# Unified steel room shell — narrow seams

Visual reference: option 1, with a tiny dark gap between the independent standard frames of two rooms.

- Every existing room art atlas remains unchanged, including WebP HD/low-density fallback, types, and upgrade levels.
- A common steel-beam/corner-plate overlay is rendered over **all** room textures and coloured fallbacks. Old per-room coloured rounded outlines are removed.
- The room's visual footprint is inset by **1 world pixel per edge**. Adjacent rooms have a **2-pixel dark seam** (1.5–5 screen pixels over 75–250% zoom). There is no corridor tile, no extra gap in grid units, and no fake traversable connection.
- The render/selection/move previews share the pure `roomShellBounds` geometry. The gameplay grid and click positions remain unchanged.
- Historical saves with pre-existing **empty grid cells** between rooms retain those actual logical gaps: drawing those rooms together would incorrectly cover space the player can dig/build in. The earlier connectivity rules still govern future construction.
- The shell graphics are a few solid rectangles and corner plates per room and do not add image network requests, physics objects, or extra GPU textures.

Test with `npm test`, `npm run build`, and desktop/mobile zoom checks.
