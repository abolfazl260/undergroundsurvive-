# Cinematic Underground — Android and web game background

- Asset: `public/assets/backgrounds/cinematic-bunker-hd.webp` — **1920 × 1200 WebP**, 325 KiB (332,622 bytes). This is the approved cinematic sunset/underground artwork without Milad Tower.
- The original 1672 × 941 generated PNG was converted with high-quality Lanczos resampling and lossy WebP quality 82, method 6. No remote image provider is needed at runtime.
- Registered in `src/app/backgroundArt.ts` as `CINEMATIC_BUNKER_BACKGROUND`. The existing `AssetManager` loads it once at 2× native logical resolution; paths are relative to Vite `BASE_URL` for Android and web hosting.
- Rendered behind soil, excavated cells, rooms, residents, the animated elevator and the sealed ground-level door. Functional door/elevator animations remain supplied by the scene, not by the flat background art.
- Top artwork covers the 960 × 600 scene; only the lower rock strip is stretched over the remaining 120 world units, avoiding a second skyline when zooming and scrolling.
- The previous `ruined-city-hd.webp` was removed from the shipped assets so it does not increase the Android download size. A new filename avoids serving cached versions of the former image.
- No changes to save data, excavation, pathfinding, room grids or camera interactions.
