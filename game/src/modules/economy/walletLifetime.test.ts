import { describe, expect, it } from 'vitest';
import { GameSession } from './session';
import { Wallet, WALLET_HISTORY_LIMIT } from './wallet';
import { getAchievementViews } from '../achievements/achievements';

describe('wallet long-term ledger (issue #116)', () => {
  it.each([4999, 5000, 5001, 10001])('round-trips %i transactions without growing saved history', (length) => {
    const wallet = Wallet.create(1000);
    for (let i = 1; i < length; i++) {
      const ok = i % 2 ? wallet.spend(1, 'build') : wallet.credit(1, 'demo-bonus');
      expect(ok).toBe(true);
    }
    const save = JSON.parse(JSON.stringify(wallet.snapshot()));
    expect(save.schemaVersion).toBe(2);
    expect(save.transactions).toHaveLength(Math.min(length, WALLET_HISTORY_LIMIT));
    const restored = Wallet.restore(save);
    expect(restored).not.toBeNull();
    expect(restored!.snapshot()).toEqual(save);
    expect(restored!.balance).toBe(wallet.balance);
    expect(restored!.transactionCount('build')).toBe(Math.ceil((length - 1)/2));
    expect(restored!.transactionCount('demo-bonus')).toBe(Math.floor((length - 1)/2));
    expect(restored!.spend(1, 'build')).toBe(true);
    expect(Wallet.restore(restored!.snapshot())).not.toBeNull();
  });

  it('upgrades legacy v1 saves with more than 5000 receipts in one migration', () => {
    const wallet = Wallet.create(1000);
    const old = wallet.snapshot();
    const transactions = [...old.transactions];
    let balance = wallet.balance;
    for (let id = 2; id <= 10001; id++) {
      const delta = id % 2 ? 1 : -1;
      balance += delta;
      transactions.push({id,kind:delta>0 ? 'demo-bonus' : 'build',delta,balanceAfter:balance});
    }
    const legacy = {schemaVersion:1,balance,nextTransactionId:10002,transactions};
    const migrated = Wallet.restore(JSON.parse(JSON.stringify(legacy)));
    expect(migrated).not.toBeNull();
    expect(migrated!.snapshot().transactions).toHaveLength(WALLET_HISTORY_LIMIT);
    expect(migrated!.transactionCount('build')).toBe(5000);
    expect(migrated!.balance).toBe(balance);
    expect(Wallet.restore(migrated!.snapshot())?.snapshot()).toEqual(migrated!.snapshot());
  });

  it('archives achievement receipts without re-paying them after restore', () => {
    const wallet = Wallet.create(1500);
    expect(wallet.creditAchievement(40,'first-room')).toBe(true);
    for (let i=0; i<600; i++) expect(wallet.spend(1,'build')).toBe(true);
    expect(wallet.snapshot().checkpoint.achievementRewards).toEqual([{achievementId:'first-room',delta:40}]);
    const restored = Wallet.restore(wallet.snapshot())!;
    expect(restored.hasAchievementReward('first-room')).toBe(true);
    expect(restored.creditAchievement(40,'first-room')).toBe(false);
    expect(restored.achievementRewards).toEqual([{achievementId:'first-room',delta:40}]);
    expect(restored.snapshot()).toEqual(wallet.snapshot());
  });

  it('preserves achievements and full session recovery after wallet compaction', () => {
    const game = GameSession.create();
    for(let i=0;i<600;i++) expect(game.wallet.spend(1,'build')).toBe(true);
    const saved = game.snapshot();
    expect(saved.wallet.checkpoint.counts.build).toBeGreaterThan(0);
    expect(getAchievementViews(saved).find(a=>a.id==='builder')?.progress).toBe(5);
    const recovered = GameSession.restore(JSON.parse(JSON.stringify(saved)));
    expect(recovered).not.toBeNull();
    expect(recovered!.snapshot()).toEqual(saved);
    expect(recovered!.wallet.transactionCount('build')).toBe(600);
  });

  it('rejects changed balances, receipt discontinuities and forged checkpoint totals', () => {
    const wallet = Wallet.create(1500);
    for(let i=0;i<600;i++) wallet.spend(1,'build');
    const good = wallet.snapshot();
    const tamperedBalance = structuredClone(good);
    tamperedBalance.checkpoint.balance++;
    expect(Wallet.restore(tamperedBalance)).toBeNull();
    const tamperedCount = structuredClone(good);
    tamperedCount.checkpoint.counts.build++;
    expect(Wallet.restore(tamperedCount)).toBeNull();
    const tamperedIds = structuredClone(good);
    tamperedIds.transactions[0].id++;
    expect(Wallet.restore(tamperedIds)).toBeNull();
    const tamperedDelta = structuredClone(good);
    tamperedDelta.transactions.at(-1)!.delta = -10;
    expect(Wallet.restore(tamperedDelta)).toBeNull();
  });
});
