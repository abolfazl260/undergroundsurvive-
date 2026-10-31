import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/modules/economy/session';

const hours = Number(process.env.GAME_SOAK_HOURS ?? '4');
if (!Number.isInteger(hours) || hours < 1 || hours > 48) {
  throw new Error('GAME_SOAK_HOURS must be an integer between 1 and 48.');
}

/** Simulated active time, not wall-clock sleep: 60s per advance call. */
describe('on-demand simulation soak', () => {
  it(`remains deterministic and restorable during ${hours} simulated hours`, () => {
    let game = GameSession.create();
    const iterations = hours * 60;
    for (let i = 0; i < iterations; i++) {
      expect(game.advanceTime(60_000)).toBe(12);
      const snapshot = game.snapshot();
      for (const value of Object.values(snapshot.resources.stock)) {
        expect(Number.isSafeInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(snapshot.water.clean).toBeGreaterThanOrEqual(0);
      expect(snapshot.lifeSupport.oxygen).toBeGreaterThanOrEqual(0);
      if (i % 30 === 29 || i === iterations - 1) {
        const restored = GameSession.restore(JSON.parse(JSON.stringify(snapshot)));
        expect(restored, `save failed at simulated minute ${i + 1}`).not.toBeNull();
        expect(restored!.snapshot()).toEqual(snapshot);
        game = restored!;
      }
    }
    expect(game.snapshot().resources.tickCount).toBe(hours * 720);
  }, 180_000);
});
