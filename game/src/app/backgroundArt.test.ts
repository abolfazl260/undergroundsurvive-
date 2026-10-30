import { describe, expect, it } from 'vitest';
import { assetUrl, chooseVariants } from './assets/assetManager';
import { RUINED_CITY_BACKGROUND, terrainOverlayOpacity } from './backgroundArt';

describe('ruined city background', () => {
  it('uses the 2× high-definition image with the existing asset loader', () => {
    expect(RUINED_CITY_BACKGROUND.kind).toBe('image');
    expect(RUINED_CITY_BACKGROUND.filter).toBe('linear');
    expect(chooseVariants(RUINED_CITY_BACKGROUND, 4)).toEqual([
      { scale: 2, path: 'assets/backgrounds/ruined-city-hd.webp' }
    ]);
    expect(assetUrl('/undergroundsurvive-/', RUINED_CITY_BACKGROUND.variants[0].path))
      .toBe('/undergroundsurvive-/assets/backgrounds/ruined-city-hd.webp');
  });

  it('keeps background visible in all zones and distinguishes excavated tiles', () => {
    expect(terrainOverlayOpacity(-1, true)).toBeGreaterThan(terrainOverlayOpacity(-1, false));
    expect(terrainOverlayOpacity(-4, false)).toBeLessThan(1);
    expect(terrainOverlayOpacity(0, true)).toBeLessThan(1);
    expect(terrainOverlayOpacity(2, false)).toBeLessThan(1);
  });
});
