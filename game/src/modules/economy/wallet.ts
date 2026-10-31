export type TransactionKind = 'starting-balance' | 'build' | 'dig' | 'floor' | 'upgrade' | 'demo-bonus' | 'research' | 'radiation' | 'air' | 'achievement-reward';

export interface WalletTransaction {
  id: number;
  kind: TransactionKind;
  delta: number;
  balanceAfter: number;
  achievementId?: string;
}

/** A bounded, auditable tail plus an aggregated prefix for long-lived shelters. */
export interface WalletCheckpoint {
  balance: number;
  counts: Record<TransactionKind, number>;
  achievementRewards: { achievementId: string; delta: number }[];
}

export interface WalletSnapshot {
  schemaVersion: 2;
  balance: number;
  nextTransactionId: number;
  transactions: WalletTransaction[];
  checkpoint: WalletCheckpoint;
}

const KINDS: readonly TransactionKind[] = [
  'starting-balance', 'build', 'dig', 'floor', 'upgrade', 'demo-bonus',
  'research', 'radiation', 'air', 'achievement-reward'
];
const VALID_KINDS: ReadonlySet<string> = new Set(KINDS);
const MAX_BALANCE = 1_000_000_000;
/** The UI needs only the newest entries. Older transactions become a validated checkpoint. */
export const WALLET_HISTORY_LIMIT = 512;

const emptyCounts = (): Record<TransactionKind,number> =>
  Object.fromEntries(KINDS.map(kind => [kind, 0])) as Record<TransactionKind,number>;
const validBalance = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_BALANCE;
const validCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

export class Wallet {
  private coins = 0;
  private entries: WalletTransaction[] = [];
  private nextId = 1;
  private checkpoint: WalletCheckpoint = { balance: 0, counts: emptyCounts(), achievementRewards: [] };
  private readonly paidAchievements = new Set<string>();

  get balance(): number { return this.coins; }
  get transactions(): readonly WalletTransaction[] { return this.entries; }

  /** Counts also cover transactions archived before the last 512 receipts. */
  transactionCount(kind: TransactionKind): number {
    return this.checkpoint.counts[kind] + this.entries.filter(entry => entry.kind === kind).length;
  }

  /** Full reward receipts remain available after history compaction. */
  get achievementRewards(): readonly {achievementId: string; delta: number}[] {
    return [
      ...this.checkpoint.achievementRewards.map(reward => ({...reward})),
      ...this.entries.filter(entry => entry.kind === 'achievement-reward')
        .map(entry => ({achievementId: entry.achievementId!, delta: entry.delta}))
    ];
  }

  canAfford(cost: number): boolean {
    return Number.isSafeInteger(cost) && cost > 0 && this.coins >= cost;
  }

  spend(cost: number, kind: 'build' | 'dig' | 'floor' | 'upgrade' | 'research' | 'radiation' | 'air'): boolean {
    if (!this.canAfford(cost)) return false;
    this.record(kind, -cost);
    return true;
  }

  credit(amount: number, kind: 'starting-balance' | 'demo-bonus'): boolean {
    if (!Number.isSafeInteger(amount) || amount <= 0 || this.coins + amount > MAX_BALANCE) {
      return false;
    }
    this.record(kind, amount);
    return true;
  }

  /** Achievement ID deduplication must survive archived receipts. */
  creditAchievement(amount: number, achievementId: string): boolean {
    if (!Number.isSafeInteger(amount) || amount <= 0 ||
        this.coins + amount > MAX_BALANCE || typeof achievementId !== 'string' ||
        !achievementId || this.hasAchievementReward(achievementId)) return false;
    this.record('achievement-reward', amount, achievementId);
    return true;
  }

  hasAchievementReward(achievementId: string): boolean {
    return this.paidAchievements.has(achievementId);
  }

  private archive(entry: WalletTransaction): void {
    this.checkpoint.balance = entry.balanceAfter;
    this.checkpoint.counts[entry.kind]++;
    if (entry.kind === 'achievement-reward')
      this.checkpoint.achievementRewards.push({achievementId: entry.achievementId!, delta: entry.delta});
  }

  private record(kind: TransactionKind, delta: number, achievementId?: string): void {
    this.coins += delta;
    this.entries.push({ id: this.nextId++, kind, delta, balanceAfter: this.coins,
      ...(achievementId ? { achievementId } : {}) });
    if (achievementId) this.paidAchievements.add(achievementId);
    if (this.entries.length > WALLET_HISTORY_LIMIT) this.archive(this.entries.shift()!);
  }

  snapshot(): WalletSnapshot {
    return {
      schemaVersion: 2,
      balance: this.coins,
      nextTransactionId: this.nextId,
      transactions: this.entries.map(entry => ({...entry})),
      checkpoint: {
        balance: this.checkpoint.balance,
        counts: {...this.checkpoint.counts},
        achievementRewards: this.checkpoint.achievementRewards.map(reward => ({...reward}))
      }
    };
  }

  static create(initialCoins: number): Wallet {
    const wallet = new Wallet();
    if (!wallet.credit(initialCoins, 'starting-balance')) throw new Error('Invalid initial balance');
    return wallet;
  }

  /** Accept all legacy v1 receipts, including >5,000, then migrate to bounded v2. */
  static restore(input: unknown): Wallet | null {
    if (!input || typeof input !== 'object') return null;
    const data = input as Partial<Omit<WalletSnapshot, 'schemaVersion'>> & { schemaVersion?: number };
    if ((data.schemaVersion !== 1 && data.schemaVersion !== 2) ||
        !Array.isArray(data.transactions) || data.transactions.length < 1 ||
        !validBalance(data.balance) || !Number.isSafeInteger(data.nextTransactionId) ||
        (data.nextTransactionId ?? 0) < 2) return null;

    const legacy = data.schemaVersion === 1;
    let checkpoint: WalletCheckpoint = {balance:0,counts:emptyCounts(),achievementRewards:[]};
    if (!legacy) {
      const cp = data.checkpoint;
      if (!cp || typeof cp !== 'object' || !validBalance(cp.balance) ||
          !cp.counts || typeof cp.counts !== 'object' || Array.isArray(cp.counts) ||
          Object.keys(cp.counts).length !== KINDS.length ||
          !KINDS.every(kind => validCount(cp.counts[kind])) ||
          !Array.isArray(cp.achievementRewards) ||
          cp.achievementRewards.length > cp.counts['achievement-reward'] ||
          !cp.achievementRewards.every(reward => reward && typeof reward.achievementId === 'string' &&
            !!reward.achievementId && Number.isSafeInteger(reward.delta) &&
            reward.delta > 0 && reward.delta <= MAX_BALANCE) ||
          cp.achievementRewards.length !== cp.counts['achievement-reward']) return null;
      checkpoint = {
        balance: cp.balance, counts:{...cp.counts},
        achievementRewards:cp.achievementRewards.map(reward => ({...reward}))
      };
    } else if (data.nextTransactionId !== data.transactions.length + 1) return null;
    if (!legacy && data.transactions.length > WALLET_HISTORY_LIMIT) return null;

    const firstId = data.nextTransactionId! - data.transactions.length;
    const archiveSize = KINDS.reduce((sum,kind) => sum + checkpoint.counts[kind], 0);
    if (!Number.isSafeInteger(archiveSize) || archiveSize !== firstId - 1 ||
        firstId < 1 || (firstId === 1 && checkpoint.balance !== 0) ||
        checkpoint.counts['starting-balance'] !== (firstId === 1 ? 0 : 1)) return null;

    const rewarded = new Set<string>();
    for (const reward of checkpoint.achievementRewards) {
      if (rewarded.has(reward.achievementId)) return null;
      rewarded.add(reward.achievementId);
    }
    let balance = checkpoint.balance;
    const wallet = new Wallet();
    wallet.checkpoint = checkpoint;

    for (let i = 0; i < data.transactions.length; i++) {
      const entry = data.transactions[i];
      if (!entry || !Number.isSafeInteger(entry.id) || entry.id !== firstId + i ||
          !VALID_KINDS.has(entry.kind) || !Number.isSafeInteger(entry.delta) || entry.delta === 0) return null;
      if ((entry.id === 1) !== (entry.kind === 'starting-balance')) return null;
      if ((entry.kind === 'starting-balance' || entry.kind === 'demo-bonus' ||
           entry.kind === 'achievement-reward') !== (entry.delta > 0)) return null;
      if (entry.kind === 'achievement-reward') {
        if (typeof entry.achievementId !== 'string' || !entry.achievementId ||
            rewarded.has(entry.achievementId)) return null;
        rewarded.add(entry.achievementId);
      } else if (entry.achievementId !== undefined) return null;
      balance += entry.delta;
      if (!validBalance(balance) || entry.balanceAfter !== balance) return null;
      // Keep memory and subsequent saves bounded even when migrating a large v1 ledger.
      wallet.entries.push({...entry});
      if (wallet.entries.length > WALLET_HISTORY_LIMIT)
        wallet.archive(wallet.entries.shift()!);
    }
    if (balance !== data.balance) return null;
    wallet.coins = balance;
    wallet.nextId = data.nextTransactionId!;
    for (const id of rewarded) wallet.paidAchievements.add(id);
    return wallet;
  }
}
