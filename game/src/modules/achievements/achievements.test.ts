import { describe, expect, it } from 'vitest';
import { GameSession } from '../economy/session';
import { AchievementTracker, ACHIEVEMENTS, getAchievementViews } from './achievements';

describe('achievement tracking', () => {
  it('starts locked and counts successful commands once, not failures', () => {
    const game = GameSession.create();
    expect(game.snapshot().achievements.unlocked).toEqual([]);
    expect(game.build('habitat', 7, 0).ok).toBe(true);
    expect(game.build('habitat', 7, 0).ok).toBe(false);
    const snapshot = game.snapshot();
    expect(snapshot.achievements.unlocked).toEqual(['first-room']);
    expect(getAchievementViews(snapshot).find((a) => a.id === 'builder')?.progress).toBe(1);
  });

  it('tracks excavation, upgrades, unlocked floors and active resource ticks', () => {
    const game = GameSession.create();
    expect(game.dig(5, -2).ok).toBe(true);
    expect(game.upgradeAt(5, -1).ok).toBe(true);
    expect(game.unlockFloor().ok).toBe(true);
    game.advanceTime(25_000);
    const earned = game.snapshot().achievements.unlocked;
    expect(earned).toContain('first-dig');
    expect(earned).toContain('first-upgrade');
    expect(earned).toContain('upper-floor');
    expect(earned).toContain('first-cycles');
    expect(earned).not.toContain('excavator');
    expect(earned).not.toContain('steady-shelter');
  });

  it('preserves completion after reload or demolition, and clears on reset', () => {
    const game = GameSession.create();
    game.build('habitat', 7, 0);
    const before = game.snapshot();
    expect(GameSession.restore(before)?.snapshot()).toEqual(before);
    const restored = GameSession.restore(before)!;
    const id = restored.layout.getRoomAt(7, 0)!.id;
    restored.layout.remove(id);
    expect(restored.snapshot().achievements.unlocked).toContain('first-room');
    restored.reset();
    expect(restored.snapshot().achievements.unlocked).toEqual([]);
  });

  it('migrates previous v3 saves while preserving their recorded progress', () => {
    const game = GameSession.create();
    game.build('habitat', 7, 0);
    game.advanceTime(25_000);
    const { achievements: _ignored, ...legacy } = game.snapshot();
    const restored = GameSession.restore({ ...legacy, schemaVersion: 3 });
    expect(restored).not.toBeNull();
    expect(restored!.snapshot().achievements.unlocked).toContain('first-room');
    expect(restored!.snapshot().achievements.unlocked).toContain('first-cycles');
  });

  it('rejects duplicate and unknown ids in v4 saves', () => {
    const base = GameSession.create().snapshot();
    expect(GameSession.restore({ ...base, achievements: { schemaVersion: 1, unlocked: ['first-room', 'first-room'] } })).toBeNull();
    expect(GameSession.restore({ ...base, achievements: { schemaVersion: 1, unlocked: ['unlisted-id'] } })).toBeNull();
    expect(AchievementTracker.restore({ schemaVersion: 1, unlocked: [] })?.snapshot().unlocked).toEqual([]);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(5);
  });
});
