import { describe, expect, it } from 'vitest';
import { GameSession } from './session';
import { Wallet } from './wallet';
import { DIG_COST, getBuildCost, getFloorCost, getUpgradeCost, STARTING_COINS } from './pricing';
import { BuildingLayout } from '../building/layout';
import { LEGACY_SURFACE_POLICY } from '../building/constructionPolicy';

describe('economy price catalog', () => {
  it('uses consistent positive integer prices', () => {
    expect(getBuildCost('habitat')).toBe(120);
    expect(getBuildCost('generator')).toBe(220);
    expect(DIG_COST).toBe(35);
    expect(getFloorCost(0)).toBe(300);
    expect(getFloorCost(1)).toBe(450);
    expect(getUpgradeCost('habitat', 1)).toBe(240);
    expect(getUpgradeCost('habitat', 2)).toBe(360);
    expect(() => getUpgradeCost('habitat', 3)).toThrow();
  });
});

describe('local wallet and transactional commands', () => {
  it('charges underground builds once; surface/upper attempts are atomic and free', () => {
    const game = GameSession.create();
    const before = game.snapshot();
    expect(game.build('habitat', 7, 0).ok).toBe(false);
    expect(game.build('habitat', 7, 1).ok).toBe(false);
    expect(game.snapshot()).toEqual(before);
    expect(game.build('habitat', 8, -1).ok).toBe(true);
    expect(game.wallet.balance).toBe(STARTING_COINS - 120 + 40);
    const after = game.snapshot();
    expect(game.build('habitat', 8, -1).ok).toBe(false);
    expect(game.snapshot()).toEqual(after);
  });

  it('charges excavation only after successful underground excavation', () => {
    const game = GameSession.create();
    const before = game.wallet.balance;
    expect(game.dig(5, -4).ok).toBe(false);
    expect(game.dig(5, 0).ok).toBe(false);
    expect(game.wallet.balance).toBe(before);
    expect(game.dig(5, -2).ok).toBe(true);
    expect(game.wallet.balance).toBe(before - DIG_COST + 25);
    expect(game.dig(5, -2).ok).toBe(false);
    expect(game.wallet.balance).toBe(before - DIG_COST + 25);
  });

  it('blocks the legacy upward floor command without charging or changing saved state', () => {
    const game = GameSession.create();
    const before = game.snapshot();
    expect(game.unlockFloor().ok).toBe(false);
    expect(game.layout.unlockFloor().ok).toBe(false);
    expect(game.layout.terrain.unlockNextFloor().ok).toBe(false);
    expect(game.snapshot()).toEqual(before);
  });

  it('prevents overspending and maximum-level upgrades without changing the world', () => {
    const game = GameSession.create();
    expect(game.upgradeAt(5, -1).ok).toBe(true);
    expect(game.upgradeAt(5, -1).ok).toBe(true);
    expect(game.wallet.balance).toBe(250 + 30);
    const before = game.snapshot();
    expect(game.build('generator', 8, 0).ok).toBe(false);
    expect(game.upgradeAt(5, -1).ok).toBe(false);
    expect(game.snapshot()).toEqual(before);
    expect(game.build('generator', 8, -1).ok).toBe(true);
    const after = game.snapshot();
    expect(game.build('mine', 2, -1).ok).toBe(false);
    expect(game.snapshot()).toEqual(after);
  });

  it('moves and removes ordinary underground rooms without charging coins', () => {
    const game = GameSession.create();
    expect(game.build('storage', 8, -1).ok).toBe(true);
    const balance = game.wallet.balance;
    const id = game.layout.getRoomAt(8, -1)!.id;
    expect(game.layout.move(id, 9, -1).ok).toBe(false);
    expect(game.layout.move(id, 9, 0).ok).toBe(false);
    expect(game.layout.remove(id).ok).toBe(true);
    expect(game.wallet.balance).toBe(balance);
  });

  it('awards demo coins once, surviving reload', () => {
    const game = GameSession.create();
    expect(game.claimDemoBonus().ok).toBe(true);
    expect(game.wallet.balance).toBe(2000);
    expect(game.claimDemoBonus().ok).toBe(false);
    const restored = GameSession.restore(game.snapshot())!;
    expect(restored.demoBonusClaimed).toBe(true);
    expect(restored.claimDemoBonus().ok).toBe(false);
    expect(restored.wallet.balance).toBe(2000);
  });

  it('saves and restores legitimate underground upgrades', () => {
    const game = GameSession.create();
    expect(game.build('medbay', 8, -1).ok).toBe(true);
    const id = game.layout.getRoomAt(8, -1)!.id;
    expect(game.upgradeRoom(id).ok).toBe(true);
    const saved = game.snapshot();
    const restored = GameSession.restore(saved)!;
    expect(restored.snapshot()).toEqual(saved);
    expect(restored.upgradeRoom(id).ok).toBe(true);
    expect(restored.layout.getRoomAt(8, -1)?.level).toBe(3);
  });

  it('restores v1 surface buildings without permitting edits or charging invalid upgrades', () => {
    const old = new BuildingLayout(undefined, LEGACY_SURFACE_POLICY);
    expect(old.place('medbay', 8, 0).ok).toBe(true);
    const migrated = GameSession.fromSave(old.snapshot());
    const room = migrated.layout.getRoomAt(8, 0)!;
    const before = migrated.snapshot();
    expect(migrated.upgradeDetails(room.id)?.cost).toBeNull();
    expect(migrated.upgradeRoom(room.id).ok).toBe(false);
    expect(migrated.layout.move(room.id, 10, 0).ok).toBe(false);
    expect(migrated.layout.remove(room.id).ok).toBe(false);
    expect(migrated.build('habitat', 10, 0).ok).toBe(false);
    expect(migrated.snapshot()).toEqual(before);
    expect(migrated.build('habitat', 8, -1).ok).toBe(true);
  });

  it('resets the underground layout, money, and bonus together', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    game.claimDemoBonus();
    game.reset();
    expect(game.wallet.balance).toBe(STARTING_COINS);
    expect(game.wallet.transactions).toHaveLength(1);
    expect(game.demoBonusClaimed).toBe(false);
    expect(game.layout.rooms).toHaveLength(4);
    expect(game.layout.rooms.every((room) => room.y < 0)).toBe(true);
  });

  it('restores v2 and rejects tampered wallet snapshots', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    const snapshot = game.snapshot();
    expect(GameSession.restore(snapshot)?.snapshot()).toEqual(snapshot);
    const bad = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    bad.wallet.balance += 500;
    expect(GameSession.restore(bad)).toBeNull();
    expect(Wallet.restore(bad.wallet)).toBeNull();
  });
});
