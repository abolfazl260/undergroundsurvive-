import { describe, expect, it } from 'vitest';
import { ResourceEngine, RESOURCE_TICK_MS, getResourceCapacity } from './resources';
import { ROOM_DEFINITIONS, type RoomType } from '../building/catalog';
import type { Room } from '../building/placement';
import { GameSession } from './session';

const room = (type: RoomType, level = 1, id = type): Room => ({
  id, type, level, x: 0, y: 0,
  width: ROOM_DEFINITIONS[type].width, height: ROOM_DEFINITIONS[type].height
});

describe('resource production and consumption', () => {
  it('uses five-second ticks and conserves input/output stocks', () => {
    const engine = ResourceEngine.create();
    const rooms = [room('command'), room('habitat'), room('generator'), room('hydroponics')];
    expect(engine.advance(2_500, rooms)).toBe(0);
    expect(engine.snapshot().stock).toEqual({ power: 12, food: 12, ore: 0, supplies: 0 });
    expect(engine.advance(2_500, rooms)).toBe(1);
    expect(engine.snapshot().stock).toEqual({ power: 16, food: 18, ore: 0, supplies: 0 });
    expect(engine.snapshot().tickCount).toBe(1);
    expect(engine.snapshot().inactiveRooms).toBe(0);
    expect(engine.remainingMs).toBe(RESOURCE_TICK_MS);
  });

  it('produces ore and supplies only with sufficient power and ore', () => {
    const engine = ResourceEngine.create();
    const rooms = [room('generator'), room('mine'), room('workshop')];
    engine.advance(RESOURCE_TICK_MS, rooms);
    expect(engine.snapshot().stock).toEqual({ power: 16, food: 12, ore: 2, supplies: 5 });
    expect(engine.snapshot().lastShortages).toEqual([]);
  });

  it('scales production on upgrade and caps all stocks using storage capacity', () => {
    const single = ResourceEngine.create();
    const upgraded = ResourceEngine.create();
    single.advance(RESOURCE_TICK_MS, [room('generator')]);
    upgraded.advance(RESOURCE_TICK_MS, [room('generator', 2)]);
    expect(upgraded.snapshot().stock.power - single.snapshot().stock.power).toBe(5);
    upgraded.advance(RESOURCE_TICK_MS, [room('generator', 3)]);
    expect(upgraded.snapshot().stock.power).toBe(30);
    expect(getResourceCapacity([room('storage', 2)])).toBe(105);
    upgraded.advance(RESOURCE_TICK_MS, [room('generator', 3), room('storage', 2)]);
    expect(upgraded.snapshot().stock.power).toBe(50);
    upgraded.reconcileCapacity([]);
    expect(upgraded.snapshot().stock.power).toBe(30);
  });

  it('never spends missing inputs; reports shortages and inactive rooms', () => {
    const engine = ResourceEngine.create();
    const rooms = [room('habitat', 3), room('workshop'), room('medbay')];
    engine.advance(RESOURCE_TICK_MS * 6, rooms);
    const state = engine.snapshot();
    expect(state.stock.power).toBeGreaterThanOrEqual(0);
    expect(state.stock.food).toBeGreaterThanOrEqual(0);
    expect(state.stock.ore).toBe(0);
    expect(state.lastShortages).toContain('power');
    expect(state.lastShortages).toContain('ore');
    expect(state.inactiveRooms).toBeGreaterThan(0);
  });

  it('ignores invalid deltas, bounds stalled-tab catch-up and keeps order deterministic', () => {
    const rooms = [room('generator'), room('habitat'), room('command'), room('hydroponics')];
    const a = ResourceEngine.create(), b = ResourceEngine.create();
    expect(a.advance(Infinity, rooms)).toBe(0);
    expect(a.advance(-500, rooms)).toBe(0);
    expect(a.advance(9999999, rooms)).toBe(12);
    expect(b.advance(60_000, [...rooms].reverse())).toBe(12);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('validates snapshots and preserves elapsed progress without offline credit', () => {
    const engine = ResourceEngine.create();
    engine.advance(1_250, []);
    const saved = engine.snapshot();
    expect(ResourceEngine.restore(saved)?.snapshot()).toEqual(saved);
    const invalid = { ...saved, stock: { ...saved.stock, food: -2 } };
    expect(ResourceEngine.restore(invalid)).toBeNull();
    expect(ResourceEngine.restore({ ...saved, elapsedMs: 5_000 })).toBeNull();
    const restored = ResourceEngine.restore(saved)!;
    expect(restored.advance(0, [])).toBe(0);
    expect(restored.advance(3_750, [])).toBe(1);
  });

  it('migrates v2 game saves, persists v3 stock, and resets with the world', () => {
    const game = GameSession.create();
    const old = game.snapshot();
    const migrated = GameSession.restore({
      schemaVersion: 2, base: old.base, wallet: old.wallet,
      demoBonusClaimed: old.demoBonusClaimed
    });
    expect(migrated).not.toBeNull();
    expect(migrated!.snapshot().resources.tickCount).toBe(0);
    expect(migrated!.advanceTime(RESOURCE_TICK_MS)).toBe(1);
    const saved = migrated!.snapshot();
    expect(GameSession.restore(saved)?.snapshot()).toEqual(saved);
    expect(GameSession.restore({ ...saved, resources: { ...saved.resources, tickCount: -1 } })).toBeNull();
    migrated!.reset();
    expect(migrated!.snapshot().resources).toEqual(GameSession.create().snapshot().resources);
  });
});
