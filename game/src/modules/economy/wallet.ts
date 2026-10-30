export type TransactionKind = 'starting-balance' | 'build' | 'dig' | 'floor' | 'upgrade' | 'demo-bonus' | 'research' | 'radiation';

export interface WalletTransaction {
  id: number;
  kind: TransactionKind;
  delta: number;
  balanceAfter: number;
}

export interface WalletSnapshot {
  schemaVersion: 1;
  balance: number;
  nextTransactionId: number;
  transactions: WalletTransaction[];
}

const VALID_KINDS: ReadonlySet<string> = new Set([
  'starting-balance', 'build', 'dig', 'floor', 'upgrade', 'demo-bonus', 'research', 'radiation'
]);
const MAX_BALANCE = 1_000_000_000;

export class Wallet {
  private coins = 0;
  private entries: WalletTransaction[] = [];
  private nextId = 1;

  get balance(): number { return this.coins; }
  get transactions(): readonly WalletTransaction[] { return this.entries; }

  canAfford(cost: number): boolean {
    return Number.isSafeInteger(cost) && cost > 0 && this.coins >= cost;
  }

  spend(cost: number, kind: 'build' | 'dig' | 'floor' | 'upgrade' | 'research' | 'radiation'): boolean {
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

  private record(kind: TransactionKind, delta: number): void {
    this.coins += delta;
    this.entries.push({ id: this.nextId++, kind, delta, balanceAfter: this.coins });
  }

  snapshot(): WalletSnapshot {
    return {
      schemaVersion: 1,
      balance: this.coins,
      nextTransactionId: this.nextId,
      transactions: this.entries.map((entry) => ({ ...entry }))
    };
  }

  static create(initialCoins: number): Wallet {
    const wallet = new Wallet();
    if (!wallet.credit(initialCoins, 'starting-balance')) throw new Error('Invalid initial balance');
    return wallet;
  }

  static restore(input: unknown): Wallet | null {
    if (!input || typeof input !== 'object') return null;
    const data = input as Partial<WalletSnapshot>;
    if (data.schemaVersion !== 1 || !Array.isArray(data.transactions) ||
        data.transactions.length < 1 || data.transactions.length > 5000 ||
        !Number.isSafeInteger(data.balance) || (data.balance ?? -1) < 0 ||
        (data.balance ?? Infinity) > MAX_BALANCE ||
        !Number.isSafeInteger(data.nextTransactionId) ||
        data.nextTransactionId !== data.transactions.length + 1) return null;
    let balance = 0;
    for (let i = 0; i < data.transactions.length; i++) {
      const entry = data.transactions[i];
      if (!entry || entry.id !== i + 1 || !VALID_KINDS.has(entry.kind) ||
          !Number.isSafeInteger(entry.delta) || entry.delta === 0) return null;
      if (i === 0 && (entry.kind !== 'starting-balance' || entry.delta <= 0)) return null;
      if (i > 0 && entry.kind === 'starting-balance') return null;
      if ((entry.kind === 'starting-balance' || entry.kind === 'demo-bonus') !== (entry.delta > 0)) return null;
      balance += entry.delta;
      if (!Number.isSafeInteger(balance) || balance < 0 || balance > MAX_BALANCE ||
          entry.balanceAfter !== balance) return null;
    }
    if (balance !== data.balance) return null;
    const wallet = new Wallet();
    wallet.coins = balance;
    wallet.nextId = data.nextTransactionId!;
    wallet.entries = data.transactions.map((entry) => ({ ...entry }));
    return wallet;
  }
}

