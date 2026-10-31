import { describe, expect, it, vi } from 'vitest';
import { GameSession, type GameSnapshot } from '../economy/session';
import { Wallet } from '../economy/wallet';
import { loadLocalBase, saveLocalBase } from '../../platform/localSave';
import { ACHIEVEMENTS, AchievementTracker, getAchievementViews, rewardForAchievement } from './achievements';

function asLegacyV13(saved: GameSnapshot) {
  let balance = 0;
  const transactions = saved.wallet.transactions.filter((txn) => txn.kind !== 'achievement-reward')
    .map((txn, index) => {
      balance += txn.delta;
      return { ...txn, id: index + 1, balanceAfter: balance };
    });
  return {
    ...saved, schemaVersion: 13,
    achievements: { schemaVersion: 1, unlocked: saved.achievements.unlocked },
    wallet: { ...saved.wallet, balance, nextTransactionId: transactions.length + 1, transactions }
  };
}

describe('achievement reward economy', () => {
  it('defines a positive safe-integer payout for each of the eleven milestones', () => {
    expect(ACHIEVEMENTS).toHaveLength(11);
    expect(new Set(ACHIEVEMENTS.map((entry) => entry.id)).size).toBe(11);
    for (const entry of ACHIEVEMENTS) {
      expect(Number.isSafeInteger(entry.rewardCoins)).toBe(true);
      expect(rewardForAchievement(entry.id)).toBeGreaterThan(0);
    }
    const locked = getAchievementViews(GameSession.create().snapshot());
    expect(locked.every((entry) => entry.rewardCoins > 0 && !entry.rewardGranted)).toBe(true);
  });

  it('automatically credits only new completed milestones to the existing wallet', () => {
    const game = GameSession.create();
    const start = game.wallet.balance;
    expect(game.build('habitat', 8, -1).ok).toBe(true);
    expect(game.wallet.balance).toBe(start - game.buildCost('habitat') + rewardForAchievement('first-room'));
    const paid = game.wallet.transactions.filter((entry) => entry.kind === 'achievement-reward');
    expect(paid).toEqual([expect.objectContaining({
      achievementId: 'first-room', delta: rewardForAchievement('first-room')
    })]);
    const earned = getAchievementViews(game.snapshot()).find((entry) => entry.id === 'first-room')!;
    expect(earned.unlocked).toBe(true);
    expect(earned.rewardGranted).toBe(true);
    expect(game.build('habitat', 8, -1).ok).toBe(false);
    for (let i = 0; i < 10; i++) game.snapshot();
    expect(game.wallet.transactions.filter((entry) => entry.kind === 'achievement-reward')).toHaveLength(1);
    expect(game.wallet.balance).toBe(start - game.buildCost('habitat') + rewardForAchievement('first-room'));
  });

  it('pays from production ticks even when the achievements dialog is never opened', () => {
    const game = GameSession.create();
    expect(game.advanceTime(25_000)).toBe(5);
    expect(game.wallet.transactions.filter((txn) => txn.kind === 'achievement-reward')).toEqual([
      expect.objectContaining({ achievementId: 'first-cycles', delta: rewardForAchievement('first-cycles') })
    ]);
    expect(game.snapshot().achievements.unlocked).toContain('first-cycles');
  });

  it('restores the exact joint ledger and grant markers and never replays after reload', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    game.advanceTime(25_000);
    const saved = game.snapshot();
    for (let i = 0; i < 3; i++) {
      const restored = GameSession.restore(saved)!;
      expect(restored).not.toBeNull();
      expect(restored.snapshot()).toEqual(saved);
      expect(restored.wallet.balance).toBe(saved.wallet.balance);
      expect(restored.wallet.transactions.filter((txn) => txn.kind === 'achievement-reward')).toHaveLength(2);
    }
  });

  it('backfills already-unlocked badges and reconstructed progress from a legacy v13 save exactly once', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    game.advanceTime(25_000);
    const legacy = asLegacyV13(game.snapshot());
    const migrated = GameSession.restore(legacy)!;
    expect(migrated).not.toBeNull();
    const payout = rewardForAchievement('first-room') + rewardForAchievement('first-cycles');
    expect(migrated.wallet.balance).toBe(legacy.wallet.balance + payout);
    expect(migrated.snapshot().schemaVersion).toBe(16);
    expect(migrated.snapshot().achievements.rewardGrantedAchievementIds)
      .toEqual(['first-room', 'first-cycles']);
    const again = GameSession.restore(migrated.snapshot())!;
    expect(again.wallet.balance).toBe(migrated.wallet.balance);
    expect(again.snapshot()).toEqual(migrated.snapshot());

    // Historic v3 saves reconstruct eligibility rather than reading a badge list.
    const { achievements: _unneeded, ...older } = legacy;
    const fromV3 = GameSession.restore({ ...older, schemaVersion: 3 })!;
    expect(fromV3.snapshot().achievements.rewardGrantedAchievementIds)
      .toEqual(['first-room', 'first-cycles']);
  });

  it('rejects mismatched or tampered v14 wallet/grant state instead of silently repairing it', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    const saved = game.snapshot();
    expect(GameSession.restore({
      ...saved, achievements: { ...saved.achievements, rewardGrantedAchievementIds: [] }
    })).toBeNull();
    expect(GameSession.restore({
      ...saved, achievements: { ...saved.achievements,
        rewardGrantedAchievementIds: ['first-room', 'first-room'] }
    })).toBeNull();
    expect(GameSession.restore({
      ...saved, achievements: { ...saved.achievements, unlocked: [] }
    })).toBeNull();
    const changed = JSON.parse(JSON.stringify(saved)) as GameSnapshot;
    const entry = changed.wallet.transactions.find((txn) => txn.kind === 'achievement-reward')!;
    entry.delta += 1;
    changed.wallet.balance += 1;
    entry.balanceAfter += 1;
    expect(GameSession.restore(changed)).toBeNull();
    expect(AchievementTracker.restore({
      schemaVersion: 2, unlocked: [], rewardGrantedAchievementIds: ['builder']
    })).toBeNull();
  });

  it('validates wallet payment amounts, uniqueness and the maximum balance', () => {
    const wallet = Wallet.create(1500);
    for (const invalid of [-1, 0, NaN, Infinity, 2.5]) {
      expect(wallet.creditAchievement(invalid, 'first-room')).toBe(false);
    }
    expect(wallet.creditAchievement(40, 'first-room')).toBe(true);
    expect(wallet.creditAchievement(40, 'first-room')).toBe(false);
    const saved = wallet.snapshot();
    expect(Wallet.restore(saved)?.snapshot()).toEqual(saved);
    const last = saved.transactions.at(-1)!;
    const twice = {
      ...saved, balance: saved.balance + 40, nextTransactionId: saved.nextTransactionId + 1,
      transactions: [...saved.transactions, { ...last, id: saved.nextTransactionId,
        balanceAfter: saved.balance + 40 }]
    };
    expect(Wallet.restore(twice)).toBeNull();
    expect(Wallet.create(1_000_000_000).creditAchievement(1, 'first-room')).toBe(false);
  });

  it('survives a failed browser save without paying twice on subsequent restoration', () => {
    const game = GameSession.create();
    game.build('habitat', 8, -1);
    const old = asLegacyV13(game.snapshot());
    const records = new Map([['underground-survive:game:v2', JSON.stringify(old)]]);
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: () => { throw new Error('QuotaExceededError'); }
    } });
    try {
      const first = GameSession.fromSave(loadLocalBase());
      expect(saveLocalBase(first.snapshot())).toBe(false);
      const second = GameSession.fromSave(loadLocalBase());
      expect(second.wallet.balance).toBe(first.wallet.balance);
      expect(second.wallet.transactions.filter((txn) => txn.kind === 'achievement-reward')).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
