import { describe, expect, it } from 'vitest';
import { ROOM_DEFINITIONS, type RoomType } from './catalog';
import { BuildingLayout } from './layout';
import { getRoomPerformance, MAX_ROOM_LEVEL } from './upgrades';
import { GameSession } from '../economy/session';
import { getUpgradeCost, STARTING_COINS } from '../economy/pricing';

describe('room upgrade capacities', () => {
  it('increases every room type capacity through all three levels', () => {
    for (const type of Object.keys(ROOM_DEFINITIONS) as RoomType[]) {
      const a = getRoomPerformance(type, 1);
      const b = getRoomPerformance(type, 2);
      const c = getRoomPerformance(type, 3);
      expect(a.value).toBeGreaterThan(0);
      expect(b.value).toBeGreaterThan(a.value);
      expect(c.value).toBeGreaterThan(b.value);
      expect(a.unit).toBe(c.unit);
    }
    expect(MAX_ROOM_LEVEL).toBe(3);
    expect(getRoomPerformance('habitat', 1).value).toBe(2);
    expect(getRoomPerformance('habitat', 3).value).toBe(6);
    expect(() => getRoomPerformance('habitat', 0)).toThrow();
    expect(() => getRoomPerformance('habitat', 4)).toThrow();
  });

  it('previews specific room upgrades without mutating or charging', () => {
    const game = GameSession.create();
    const before = game.snapshot();
    expect(game.upgradeDetails('initial-habitat')).toMatchObject({
      id: 'initial-habitat', level: 1, cost: getUpgradeCost('habitat', 1),
      current: { value: 2 }, next: { value: 4 }
    });
    expect(game.upgradeCostAt(10, -2)).toBe(240);
    expect(game.upgradeDetails('missing')).toBeNull();
    expect(game.snapshot()).toEqual(before);
  });

  it('charges only on confirmation, changes capacity, and reprices the next level', () => {
    const game = GameSession.create();
    const id = 'initial-habitat';
    expect(game.upgradeRoom(id)).toEqual({ ok: true });
    expect(game.layout.getRoomAt(10, -2)?.level).toBe(2);
    expect(game.upgradeDetails(id)?.current.value).toBe(4);
    expect(game.upgradeDetails(id)?.next?.value).toBe(6);
    expect(game.upgradeDetails(id)?.cost).toBe(360);
    expect(game.wallet.balance).toBe(STARTING_COINS - 240);
    expect(game.upgradeRoom(id).ok).toBe(true);
    expect(game.wallet.balance).toBe(STARTING_COINS - 600);
    expect(game.upgradeDetails(id)?.cost).toBeNull();
    expect(game.upgradeDetails(id)?.next).toBeNull();
    const final = game.snapshot();
    expect(game.upgradeRoom(id).ok).toBe(false);
    expect(game.snapshot()).toEqual(final);
    expect(GameSession.restore(final)?.upgradeDetails(id)).toEqual(game.upgradeDetails(id));
  });

  it('rejects missing rooms and insufficient funds without changing the wallet or map', () => {
    const game = GameSession.create();
    expect(game.upgradeRoom('initial-command').ok).toBe(true);
    expect(game.upgradeRoom('initial-command').ok).toBe(true);
    const before = game.snapshot(); // 250 coins remain.
    expect(game.upgradeRoom('initial-power').ok).toBe(false);
    expect(game.upgradeRoom('missing').ok).toBe(false);
    expect(game.snapshot()).toEqual(before);
  });

  it('still rejects saved rooms exceeding the maximum level', () => {
    const layout = new BuildingLayout();
    const invalid = layout.snapshot();
    invalid.rooms[0].level = 4;
    expect(BuildingLayout.restore(invalid)).toBeNull();
  });
});
