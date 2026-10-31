# Cinematic Underground — Android and web game background

- Asset: `public/assets/backgrounds/cinematic-bunker-hd.webp` — **1920 × 1200 WebP**, 325 KiB (332,622 bytes). This is the approved cinematic sunset/underground artwork without Milad Tower.
- The original 1672 × 941 generated PNG was converted with high-quality Lanczos resampling and lossy WebP quality 82, method 6. No remote image provider is needed at runtime.
- Registered in `src/app/backgroundArt.ts` as `CINEMATIC_BUNKER_BACKGROUND`. The existing `AssetManager` loads it once at 2× native logical resolution; paths are relative to Vite `BASE_URL` for Android and web hosting.
- Rendered behind soil, excavated cells, rooms, residents, the animated elevator and the sealed ground-level door. Functional door/elevator animations remain supplied by the scene, not by the flat background art.
- Top artwork covers the 960 × 600 scene; only the lower rock strip is stretched over the remaining 120 world units, avoiding a second skyline when zooming and scrolling.
- The previous `ruined-city-hd.webp` was removed from the shipped assets so it does not increase the Android download size. A new filename avoids serving cached versions of the former image.
- No changes to save data, excavation, pathfinding, room grids or camera interactions.

## Surface and elevator alignment correction

The source WebP still contains a *painted*, non-interactive bunker entrance
and shaft at the left edge. `cinematicBackdrop.ts` composes a one-time canvas
texture from that source: it replaces the baked left-side column with
feathered nearby scenery, mirrors the donor to avoid a repeated silhouette,
and maps the photo's ground seam to the **actual** `WORLD.groundLineY`.

The canvas is generated **once** by Phaser on scene setup rather than each
frame. No additional external images or requests are required. All live
elevator/car/door graphics remain in `elevatorArt.ts` and preserve their
existing grid coordinates. The skyline is drawn as a single, uninterrupted
strip to avoid extra copies of the buildings above ground.

The gameplay world remains 960×720 units with unchanged 54px cells,
elevator positions and saved-game layout. The new 1920×1440 runtime texture
covers the complete vertical scene (no repeated or stretched bottom fragment).
A fallback to the original asset keeps the game usable if canvas composition
fails on a particular device. The runtime composes from the *existing*
shipped WebP; replacing its source with a newly approved photograph later
requires updating the asset separately.
