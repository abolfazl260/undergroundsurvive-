# Ruined City — game background

- Asset: `public/assets/backgrounds/ruined-city-hd.webp` (1920×1200, WebP).
- Display: full 960×600 Phaser game canvas at 0,0, matching the existing ground line at world y=312 and preserving the 14-column room grid.
- Loaded by the existing `AssetManager` through `RUINED_CITY_BACKGROUND`; `import.meta.env.BASE_URL` supports GitHub Pages and local Vite.
- The background stays behind terrain, rooms, residents and previews; all grid rules, digging, room illustrations and zoom controls remain unchanged.
- Semi-transparent terrain fills preserve the cutaway soil texture while making available/excavated tiles visually distinct.
- A solid color fallback covers out-of-image areas during panning and handles missing textures. No external image services or network dependencies are introduced beyond the app's own assets.
