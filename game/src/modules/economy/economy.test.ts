import { describe, expect, it } from 'vitest';
import { GameSession } from './session';
import { Wallet } from './wallet';
import { DIG_COST, getBuildCost, getFloorCost, getUpgradeCost, STARTING_COINS } from './pricing';
import { BuildingLayout } from '../building/layout';

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
  it('charges room construction once and leaves money unchanged on failed placement', () => {
    const game = GameSession.create();
    const start = game.wallet.balance;
    const before = game.layout.rooms.length;
    expect(game.build('habitat', 7, 0).ok).toBe(true);
    expect(game.wallet.balance).toBe(start - 120);
    expect(game.layout.rooms.length).toBe(before + 1);
    expect(game.build('habitat', 7, 0).ok).toBe(false);
    expect(game.wallet.balance).toBe(start - 120);
    expect(game.wallet.transactions).toHaveLength(2);
  });

  it('charges excavation only when the target can be dug', () => {
    const game = GameSession.create();
    const before = game.wallet.balance;
    expect(game.dig(5, -4).ok).toBe(false);
    expect(game.wallet.balance).toBe(before);
    expect(game.dig(5, -2).ok).toBe(true);
    expect(game.wallet.balance).toBe(before - DIG_COST);
    expect(game.dig(5, -2).ok).toBe(false);
    expect(game.wallet.balance).toBe(before - DIG_COST);
  });

  it('charges sequential floor unlocks and stops at world limit', () => {
    const game = GameSession.create();
    expect(game.unlockFloor().ok).toBe(true);
    expect(game.layout.terrain.highestFloor).toBe(1);
    expect(game.wallet.balance).toBe(STARTING_COINS - 300);
    expect(game.unlockFloor().ok).toBe(true);
    expect(game.wallet.balance).toBe(STARTING_COINS - 750);
    expect(game.unlockFloor().ok).toBe(false);
    expect(game.wallet.balance).toBe(STARTING_COINS - 750);
  });

  it('prevents overspending and negative balances without changing the world', () => {
    const game = GameSession.create();
    expect(game.upgradeAt(5, -1).ok).toBe(true); // command 250 * 2 = 500
    expect(game.upgradeAt(5, -1).ok).toBe(true); // command 250 * 3 = 750
    expect(game.wallet.balance).toBe(250);
    const before = game.snapshot();
    const attempt = game.unlockFloor(); // 300
    expect(attempt.ok).toBe(false);
    expect(game.snapshot()).toEqual(before);
    expect(game.upgradeAt(5, -1).ok).toBe(false); // max level
    expect(game.snapshot()).toEqual(before);
  });

  it('preserves coins when moving or removing rooms for free', () => {
    const game = GameSession.create();
    expect(game.build('storage', 7, 0).ok).toBe(true);
    const coinBalance = game.wallet.balance;
    const id = game.layout.getRoomAt(7, 0)!.id;
    expect(game.layout.move(id, 8, 0).ok).toBe(true);
    expect(game.layout.remove(id).ok).toBe(true);
    expect(game.wallet.balance).toBe(coinBalance);
  });

  it('awards the demo bonus once only, including after reload', () => {
    const game = GameSession.create();
    expect(game.claimDemoBonus().ok).toBe(true);
    expect(game.wallet.balance).toBe(2000);
    expect(game.claimDemoBonus().ok).toBe(false);
    const restored = GameSession.restore(game.snapshot())!;
    expect(restored.demoBonusClaimed).toBe(true);
    expect(restored.claimDemoBonus().ok).toBe(false);
    expect(restored.wallet.balance).toBe(2000);
  });

  it('resets the world and balance together', () => {
    const game = GameSession.create();
    game.build('habitat', 7, 0);
    game.claimDemoBonus();
    game.reset();
    expect(game.wallet.balance).toBe(STARTING_COINS);
    expect(game.wallet.transactions).toHaveLength(1);
    expect(game.demoBonusClaimed).toBe(false);
    expect(game.layout.rooms).toHaveLength(4);
  });

  it('restores v2 snapshots, migrates existing v1 layouts, and rejects tampered wallet snapshots', () => {
    const game = GameSession.create();
    game.build('habitat', 7, 0);
    const snapshot = game.snapshot();
    expect(GameSession.restore(snapshot)?.snapshot()).toEqual(snapshot);
    const bad = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    bad.wallet.balance += 500;
    expect(GameSession.restore(bad)).toBeNull();
    expect(Wallet.restore(bad.wallet)).toBeNull();
    const oldLayout = new BuildingLayout();
    expect(oldLayout.place('medbay', 7, 0).ok).toBe(true);
    const migrated = GameSession.fromSave(oldLayout.snapshot());
    expect(migrated.layout.rooms.length).toBe(5);
    expect(migrated.wallet.balance).toBe(STARTING_COINS);
  });
});

