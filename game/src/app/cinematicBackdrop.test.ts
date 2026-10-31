import { describe, expect, it } from 'vitest';
import { backgroundPlacement, BACKDROP_SOURCE } from './cinematicBackdrop';
import { WORLD } from '../modules/world/grid';
import { GAME_VIEW } from './viewport';

describe('cinematic background / live elevator alignment', () => {
  it('places the photo surface on the real grid surface, not on the original image seam', () => {
    const placement = backgroundPlacement(
      GAME_VIEW.worldWidth, GAME_VIEW.worldHeight, WORLD.groundLineY
    );
    expect(placement).toMatchObject({
      width: 1920, height: 1440, ground: 624,
      skylineTop: 0, skylineHeight: 624, rockHeight: 816
    });
    expect(placement.skylineTop + placement.skylineHeight).toBe(placement.ground);
    expect(placement.ground + placement.rockHeight).toBe(placement.height);
    expect(placement.ground / 2).toBe(WORLD.groundLineY);
  });

  it('fully covers the baked shaft while keeping donor patches within the image', () => {
    expect(BACKDROP_SOURCE.maskEndX).toBeGreaterThan(BACKDROP_SOURCE.embeddedShaftEndX);
    expect(BACKDROP_SOURCE.sampleStartX + BACKDROP_SOURCE.maskEndX)
      .toBeLessThan(BACKDROP_SOURCE.width);
    expect(BACKDROP_SOURCE.surfaceY).toBeGreaterThan(0);
    expect(BACKDROP_SOURCE.surfaceY).toBeLessThan(BACKDROP_SOURCE.height);
  });

  it('is independent of game-save grid and rejects invalid viewport geometry', () => {
    expect(backgroundPlacement(480, 720, 300, 2).ground).toBe(600);
    expect(() => backgroundPlacement(960, 720, 800)).toThrow();
    expect(() => backgroundPlacement(960, 720, 312, 0)).toThrow();
  });
});
