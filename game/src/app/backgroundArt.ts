import type { TextureAsset } from './assets/assetManager';

/**
 * Precomposed 1920×1440 WebP, exact 2× of the game's 960×720 world.
 * The photograph's surface is at image y=624: WORLD.groundLineY * 2.
 * No baked elevator: the live blast door, shaft and cars stay interactive.
 */
export const CINEMATIC_BUNKER_BACKGROUND: TextureAsset = {
  key: 'cinematic-bunker-background-v2',
  kind: 'image',
  filter: 'linear',
  variants: [{ scale: 2, path: 'assets/backgrounds/cinematic-surface-v2-hd.webp' }]
};

export const BACKGROUND_NATIVE_GEOMETRY = {
  width: 1920,
  height: 1440,
  surfaceY: 624
} as const;

/** Keep soil texture visible while showing which tiles are open or blocked. */
export function terrainOverlayOpacity(y: number, open: boolean): number {
  if (y < 0) return open ? 0.58 : 0.23;
  if (y === 0) return 0.22;
  return open ? 0.12 : 0.08;
}
