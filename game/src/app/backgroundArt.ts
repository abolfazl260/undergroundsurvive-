import type { TextureAsset } from './assets/assetManager';

/** Optimized 1920×1200 cinematic cutaway; displayed at 960×600 world units. */
export const CINEMATIC_BUNKER_BACKGROUND: TextureAsset = {
  key: 'cinematic-bunker-background',
  kind: 'image',
  filter: 'linear',
  variants: [
    { scale: 2, path: 'assets/backgrounds/cinematic-bunker-hd.webp' }
  ]
};

/** Keep soil texture visible while showing which tiles are open or blocked. */
export function terrainOverlayOpacity(y: number, open: boolean): number {
  if (y < 0) return open ? 0.58 : 0.23;
  if (y === 0) return 0.22;
  return open ? 0.12 : 0.08;
}
