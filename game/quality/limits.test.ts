import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/modules/economy/session';
import { Wallet } from '../src/modules/economy/wallet';

/** Release blockers: these fail until long-lived saves can survive the known limits. */
describe('long-lived save boundary checks (release gate)', () => {
  it('loads a save beyond 100,000 life-support cycles', () => {
    const saved = GameSession.create().snapshot();
    saved.lifeSupport.ticks = 100_001;
    expect(GameSession.restore(saved)).not.toBeNull();
  });

  it('does not make a valid wallet unloadable after the 5,000th transaction', () => {
    const wallet = Wallet.create(1500);
    for (let i = 0; i < 5000; i++) {
      expect(wallet.spend(1, 'build')).toBe(true);
      expect(wallet.credit(1, 'demo-bonus')).toBe(true);
    }
    expect(Wallet.restore(wallet.snapshot())).not.toBeNull();
  });
});
