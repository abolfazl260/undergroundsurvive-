import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/modules/economy/session';
import { BuildingLayout } from '../src/modules/building/layout';

/**
 * These tests intentionally live outside src, so the normal on-push `npm test`
 * remains fast. Run explicitly via `npm run quality:integration`.
 */
describe('on-demand game integration', () => {
  it('preserves a real purchase, bonus and economy cycle through serialization', () => {
    const game = GameSession.create();
    const opening = game.wallet.balance;
    expect(game.build('habitat', 8, -1).ok).toBe(true);
    expect(game.claimDemoBonus().ok).toBe(true);
    expect(game.wallet.balance).toBeGreaterThan(opening);
    expect(game.advanceTime(5_000)).toBe(1);
    const saved = JSON.parse(JSON.stringify(game.snapshot()));
    const restored = GameSession.restore(saved);
    expect(restored).not.toBeNull();
    expect(restored!.snapshot()).toEqual(game.snapshot());
    expect(restored!.layout.getRoomAt(8, -1)?.type).toBe('habitat');
    expect(restored!.claimDemoBonus().ok).toBe(false);
  });

  it('produces the same state for identical inputs after a save/load boundary', () => {
    const original = GameSession.create();
    original.advanceTime(15_000);
    const a = GameSession.restore(original.snapshot())!;
    const b = GameSession.restore(original.snapshot())!;
    for (let i = 0; i < 12; i++) {
      expect(a.advanceTime(5_000)).toBe(1);
      expect(b.advanceTime(5_000)).toBe(1);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('caps a suspended-device delta instead of granting hours of offline resources', () => {
    const game = GameSession.create();
    expect(game.advanceTime(60 * 60 * 1000)).toBe(12);
    expect(game.snapshot().resources.tickCount).toBe(12);
    expect(GameSession.restore(game.snapshot())).not.toBeNull();
  });

  it('rejects forged balances and overlapping rooms without accepting partial saves', () => {
    const valid = GameSession.create().snapshot();
    const changedCoins = structuredClone(valid);
    changedCoins.wallet.balance += 777;
    expect(GameSession.restore(changedCoins)).toBeNull();

    const collided = structuredClone(valid);
    collided.base.rooms.push({ ...collided.base.rooms[0], id: 'impossible-overlap' });
    expect(GameSession.restore(collided)).toBeNull();
    expect(BuildingLayout.restore(collided.base)).toBeNull();
    expect(GameSession.restore(valid)).not.toBeNull();
  });
});
