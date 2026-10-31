import { describe, expect, it } from 'vitest';
import { GameSession } from '../economy/session';

function depletedAir(quality: number): GameSession {
  const initial = GameSession.create().snapshot();
  const restored = GameSession.restore({...initial,air:{...initial.air,quality}});
  expect(restored).not.toBeNull();
  return restored!;
}

describe('zero breathable air ends the current game', () => {
  it('ends on the first zero-air cycle, not earlier, even for a large time delta', () => {
    const game = depletedAir(0.1);
    expect(game.isGameOver).toBe(false);
    expect(game.advanceTime(60_000)).toBe(1);
    expect(game.air.snapshot().quality).toBe(0);
    expect(game.isGameOver).toBe(true);
    const finished = game.snapshot();
    expect(finished.resources.tickCount).toBe(1);
    expect(finished.air.nowMs).toBe(5000);
    expect(finished.research.nowMs).toBe(5000);
    expect(finished.radiation.nowMs).toBe(5000);
    expect(game.advanceTime(60_000)).toBe(0);
    expect(game.snapshot()).toEqual(finished);
  });

  it('does not end the game just because air is critical but still positive', () => {
    const game = depletedAir(15);
    expect(game.advanceTime(5_000)).toBe(1);
    expect(game.air.snapshot().quality).toBeGreaterThan(0);
    expect(game.isGameOver).toBe(false);
    expect(game.advanceTime(5_000)).toBe(1);
  });

  it('keeps defeat after JSON save and reload and blocks construction/coins', () => {
    const game = depletedAir(0);
    expect(game.isGameOver).toBe(true);
    const saved = JSON.parse(JSON.stringify(game.snapshot()));
    const loaded = GameSession.restore(saved);
    expect(loaded).not.toBeNull();
    expect(loaded!.isGameOver).toBe(true);
    expect(loaded!.advanceTime(30_000)).toBe(0);
    expect(loaded!.build('habitat',8,-1).ok).toBe(false);
    expect(loaded!.claimDemoBonus().ok).toBe(false);
    expect(loaded!.snapshot()).toEqual(saved);
  });

  it('allows a deliberate new game after defeat, not a revival of the old save', () => {
    const game=depletedAir(0);
    game.reset();
    expect(game.isGameOver).toBe(false);
    expect(game.air.snapshot().quality).toBe(100);
    expect(game.resources.tickCount).toBe(0);
    expect(game.advanceTime(5_000)).toBe(1);
  });

  it('rejects invalid air values instead of silently treating them as defeat', () => {
    const snapshot=GameSession.create().snapshot();
    expect(GameSession.restore({...snapshot,air:{...snapshot.air,quality:-1}})).toBeNull();
    expect(GameSession.restore({...snapshot,air:{...snapshot.air,quality:101}})).toBeNull();
  });
});
