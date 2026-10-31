import { describe, expect, it } from 'vitest';
import { assetUrl, chooseVariants } from './assets/assetManager';
import { CINEMATIC_BUNKER_BACKGROUND, BACKGROUND_NATIVE_GEOMETRY, terrainOverlayOpacity } from './backgroundArt';
import { GAME_VIEW } from './viewport';
import { WORLD } from '../modules/world/grid';
import { readFileSync } from 'node:fs';

describe('cinematic bunker background', () => {
  it('uses the 2× high-definition image with the existing asset loader', () => {
    expect(CINEMATIC_BUNKER_BACKGROUND.kind).toBe('image');
    expect(CINEMATIC_BUNKER_BACKGROUND.filter).toBe('linear');
    expect(chooseVariants(CINEMATIC_BUNKER_BACKGROUND, 4)).toEqual([
      { scale: 2, path: 'assets/backgrounds/cinematic-surface-v2-hd.webp' }
    ]);
    expect(assetUrl('/undergroundsurvive-/', CINEMATIC_BUNKER_BACKGROUND.variants[0].path))
      .toBe('/undergroundsurvive-/assets/backgrounds/cinematic-surface-v2-hd.webp');
  });

  it('ships the exact 2× world-size WebP with its surface line aligned to the game grid', () => {
    expect(BACKGROUND_NATIVE_GEOMETRY).toEqual({
      width: GAME_VIEW.worldWidth * 2,
      height: GAME_VIEW.worldHeight * 2,
      surfaceY: WORLD.groundLineY * 2
    });
    const bytes = readFileSync(new URL('../../public/assets/backgrounds/cinematic-surface-v2-hd.webp', import.meta.url));
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 16)).toBe('WEBPVP8 ');
    expect(bytes.readUInt16LE(26) & 0x3fff).toBe(BACKGROUND_NATIVE_GEOMETRY.width);
    expect(bytes.readUInt16LE(28) & 0x3fff).toBe(BACKGROUND_NATIVE_GEOMETRY.height);
    expect(bytes.byteLength).toBeLessThan(550 * 1024);
  });

  it('keeps background visible in all zones and distinguishes excavated tiles', () => {
    expect(terrainOverlayOpacity(-1, true)).toBeGreaterThan(terrainOverlayOpacity(-1, false));
    expect(terrainOverlayOpacity(-4, false)).toBeLessThan(1);
    expect(terrainOverlayOpacity(0, true)).toBeLessThan(1);
    expect(terrainOverlayOpacity(2, false)).toBeLessThan(1);
  });
});
