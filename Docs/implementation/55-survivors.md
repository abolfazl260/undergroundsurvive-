# Survivor rendering

Three original illustrated survivor variants, each with two idle, walk and work frames.
Generated using the built-in image tool. Prompt: side-view painterly post-apocalyptic
mechanic, medic and worker, consistent anatomy, muted clothing, transparent 6 by 3 atlas.
The build-time atlas packing trims alpha margins and places feet at each frame's bottom.
The bundled 128 by 192 frames are cached once by AssetManager. No per-tick texture creation.

Useful room interior is ceiling 13 to floor 44 in a 54-unit cell. Height is 56% of
that interior, bounded to 12–40 world units. This common interior applies across room
art and corridors to prevent size jumps. Logical route coordinates remain unchanged;
only the render foot offset is applied. Room labels occupy the ceiling strip.
Selection uses an independent zoom-aware touch rectangle. Reduced motion freezes poses.

Validation: 139 tests passed; TypeScript and Vite production build passed. Texture has
real alpha. Automated visual browser validation is pending browser availability.
