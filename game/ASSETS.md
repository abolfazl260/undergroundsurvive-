# Asset manager — image and texture quality

Room images are declared in `src/app/roomArt.ts` and managed by
`src/app/assets/assetManager.ts`. The manifest currently ships both real
sources already present on `main`:

- `public/assets/rooms/room-atlas-hd.webp` — six frames at **1024 × 341**,
  produced from the original high-detail artwork. This is the preferred source.
- `public/assets/rooms/room-atlas.webp` — six frames at **160 × 53**.
  This is a fast-loading fallback if the HD request fails.
- `public/assets/rooms/garden-medbay-atlas-hd.webp` — two **1024 × 341** frames: hydroponics (0), medbay (1).
- `public/assets/rooms/garden-medbay-atlas.webp` — matching two **160 × 53** fallback frames.

At preload time the manager selects the smallest declared image density that
meets the highest camera zoom × device pixel ratio (capped at 4× as a
memory-minded target). The shipped HD image has density **6.4×** relative
to the 160px-wide fallback, with explicit 1024 × 341 frame dimensions.
Both variants are queued under separate keys; only a successfully loaded
texture with the requested frame is used. Filtering is explicitly linear for
illustrated rooms. If both fail, coloured room placeholders remain playable.

## Adding / replacing artwork

1. Produce a new WebP from **original high-resolution source**, not by
   interpolating the 160px image.
2. Keep the original atlas frames in order: habitat, command, workshop,
   storage, generator, mine. The separate two-frame atlas contains hydroponics
   and medbay. Do not change room type names or game-state data.
3. Add the new file under `public/assets/rooms` and register its real
   `scale`, `path`, `frameWidth` and `frameHeight` in `roomArt.ts`.
   Only register a file once it exists in the repository.
4. Keep the low-resolution WebP as a fallback, and run `npm test` and
   `npm run build`.
5. Verify 75% and 250% zoom, mobile and desktop, a failed HD request, and
   fallback for any room whose sprite texture could not be loaded.

Standalone `image` assets and multi-frame `spritesheet` assets use the
same manager, which can later support characters, UI and terrain textures.
URLs are automatically prefixed with Vite `BASE_URL` for GitHub Pages.

**Implementation scope:** The manager only changes image loading and texture
selection. It does not modify layouts, camera logic, UI placement, economy,
missions, persistence, or the existing artwork files.


## Level 2 room art completion (#95)

Nine additional upgraded interiors are raster WebP sprites, with no embedded people or text.
The 8-frame `level2-additions-v2.webp` atlas (4 columns × 2 rows) uses 160×53 frames;
`level2-additions-v2-hd.webp` uses 560×186 native-source-derived frames (3.5×). Ordered frames:
habitat, hydroponics, workshop, storage, mine, recreation, guardPost, ventilation.

The three-cell command room uses a dedicated true panoramic source, rather than mirrored edges (`level2-command-v2.webp`, 240×53; `level2-command-v2-hd.webp`, 840×186).
The new 1× images total about 25 KiB; 3.5× source-derived variants are loaded through `AssetManager`. The images preserve the existing industrial bunker cutaway framing, have no embedded labels or characters, and avoid geometric stretching.
The five pre-existing Level 2 frames (generator, waterTreatment, kitchen, medbay,
laboratory) are unchanged.

`roomArtCandidates(type, level)` selects Level 2 artwork for all 14 room types at
level >= 2; when an upgraded texture or frame is unavailable, existing Level 1
art or the basic graphical placeholder remains available. No new artwork is
defined for Level 3 yet.


### Level 2 visual quality revision

- Replaced the cropped comparison-sheet artwork with high-detail purpose-built bunker interiors for all nine upgraded room types; the legacy originals remain present for older cached clients.
- Kept the eight-frame row-major mapping and three-cell command asset contract; upgraded HD sizes to 560×186 and 840×186 respectively, compared with 360×120 and 540×120 before. New versioned filenames avoid stale image caching.
- Tests verify every WebP image's true encoded pixel dimensions, atlas frame count, mapping and fallback. The five other pre-existing Level 2 rooms are unchanged.
- Verify mobile 75%/100%/250% zoom visually after deployment.
