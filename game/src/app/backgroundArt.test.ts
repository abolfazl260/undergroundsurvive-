import { describe, expect, it } from 'vitest';
import { assetUrl, chooseVariants } from './assets/assetManager';
import { CINEMATIC_BUNKER_BACKGROUND, terrainOverlayOpacity } from './backgroundArt';

describe('cinematic bunker background', () => {
  it('uses the 2× high-definition image with the existing asset loader', () => {
    expect(CINEMATIC_BUNKER_BACKGROUND.kind).toBe('image');
    expect(CINEMATIC_BUNKER_BACKGROUND.filter).toBe('linear');
    expect(chooseVariants(CINEMATIC_BUNKER_BACKGROUND, 4)).toEqual([
      { scale: 2, path: 'assets/backgrounds/cinematic-bunker-hd.webp' }
    ]);
    expect(assetUrl('/undergroundsurvive-/', CINEMATIC_BUNKER_BACKGROUND.variants[0].path))
      .toBe('/undergroundsurvive-/assets/backgrounds/cinematic-bunker-hd.webp');
  });

  it('keeps background visible in all zones and distinguishes excavated tiles', () => {
    expect(terrainOverlayOpacity(-1, true)).toBeGreaterThan(terrainOverlayOpacity(-1, false));
    expect(terrainOverlayOpacity(-4, false)).toBeLessThan(1);
    expect(terrainOverlayOpacity(0, true)).toBeLessThan(1);
    expect(terrainOverlayOpacity(2, false)).toBeLessThan(1);
  });
});
