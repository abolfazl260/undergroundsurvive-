import type { TextureAsset } from './assets/assetManager';

/** Original 1920×1200 cutaway art displayed at the game's 960×600 logical size. */
export const RUINED_CITY_BACKGROUND: TextureAsset = {
  key: 'ruined-city-background',
  kind: 'image',
  filter: 'linear',
  variants: [
    { scale: 2, path: 'assets/backgrounds/ruined-city-hd.webp' }
  ]
};

/** Keep soil texture visible while showing which tiles are open or blocked. */
export function terrainOverlayOpacity(y: number, open: boolean): number {
  if (y < 0) return open ? 0.58 : 0.23;
  if (y === 0) return 0.22;
  return open ? 0.12 : 0.08;
}
