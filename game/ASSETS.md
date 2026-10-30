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
