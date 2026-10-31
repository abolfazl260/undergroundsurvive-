# Cinematic city / underground background — Web and Android

- **Active asset:** `public/assets/backgrounds/cinematic-surface-v2-hd.webp`, **1920 × 1440**, approximately **404 KiB**, lossy WebP quality 82.
- Artwork is the newly generated ruined city sunset above the geological cutaway. It contains **no baked blast door, elevator, or elevator shaft** and has a more varied surface skyline.
- The asset is composited offline at the exact **2× logical world dimensions (960 × 720)**. The surface seam is at image `y=624`, corresponding to `WORLD.groundLineY=312`.
- The source 1448 × 1086 image is scaled **uniformly** to 1920 × 1440 (both 4:3). Only a 26px top offset and a minimal rocky bottom extension align the ground seam. City buildings are not stretched independently.
- `GameScene.drawBackdrop()` now displays a **single image** with its original aspect ratio; there is no runtime canvas copy, duplicated painted elevator, stretched skyline, or repeated rock strip. The old background compositor was removed.
- The **real**, functional steel exit door, lift shaft and elevator cars are drawn independently by `elevatorArt.ts` at unchanged grid coordinates.
- Vite bundles the static asset in both Android and web; no third-party image requests occur. The versioned filename avoids stale browser/service-worker caches.
- The previous `cinematic-bunker-hd.webp` is deleted from the game bundle, saving unnecessary package bytes.
- Room dimensions, camera limits, touch controls, physics, movement, excavation, economy and saved game data are unchanged.
