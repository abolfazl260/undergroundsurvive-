import { BuildingLayout, type BaseSnapshot } from '../building/layout';
import { Wallet, type WalletSnapshot } from './wallet';
import {
  STARTING_COINS, DEMO_BONUS_COINS, DIG_COST,
  getBuildCost, getFloorCost, getUpgradeCost
} from './pricing';
import type { BuildableRoomType } from '../building/catalog';
import type { PlacementResult } from '../building/placement';

export interface GameSnapshot {
  schemaVersion: 2;
  base: BaseSnapshot;
  wallet: WalletSnapshot;
  demoBonusClaimed: boolean;
}

export interface CommandResult extends PlacementResult {}
type SpendKind = 'build' | 'dig' | 'floor' | 'upgrade';

export class GameSession {
  private world: BuildingLayout;
  private purse: Wallet;
  private bonusClaimed = false;

  private constructor(layout: BuildingLayout, wallet: Wallet, claimed = false) {
    this.world = layout;
    this.purse = wallet;
    this.bonusClaimed = claimed;
  }

  static create(): GameSession {
    return new GameSession(new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  static restore(raw: unknown): GameSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Partial<GameSnapshot>;
    if (value.schemaVersion !== 2 || typeof value.demoBonusClaimed !== 'boolean') return null;
    const world = BuildingLayout.restore(value.base);
    const wallet = Wallet.restore(value.wallet);
    if (!world || !wallet) return null;
    const bonusCount = wallet.transactions.filter((t) => t.kind === 'demo-bonus').length;
    if ((value.demoBonusClaimed && bonusCount !== 1) ||
        (!value.demoBonusClaimed && bonusCount !== 0)) return null;
    return new GameSession(world, wallet, value.demoBonusClaimed);
  }

  // Existing v1 browser saves contain only a layout; migrate without losing rooms.
  static fromSave(raw: unknown): GameSession {
    return GameSession.restore(raw) ??
      new GameSession(BuildingLayout.restore(raw) ?? new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  get layout(): BuildingLayout { return this.world; }
  get wallet(): Wallet { return this.purse; }
  get demoBonusClaimed(): boolean { return this.bonusClaimed; }

  buildCost(type: BuildableRoomType): number { return getBuildCost(type); }
  digCost(): number { return DIG_COST; }
  floorCost(): number { return getFloorCost(this.world.terrain.highestFloor); }

  upgradeCostAt(x: number, y: number): number | null {
    const room = this.world.getRoomAt(x, y);
    return room && room.level < 3 ? getUpgradeCost(room.type, room.level) : null;
  }

  canAfford(cost: number): boolean { return this.purse.canAfford(cost); }

  private execute(cost: number, kind: SpendKind, apply: (layout: BuildingLayout) => PlacementResult): CommandResult {
    // Mutate an isolated candidate first; failed placement must not charge the wallet.
    const candidate = BuildingLayout.restore(this.world.snapshot());
    if (!candidate) return { ok: false, reason: 'اطلاعات نقشه معتبر نیست.' };
    const result = apply(candidate);
    if (!result.ok) return result;
    if (!this.purse.canAfford(cost)) return { ok: false, reason: 'سکهٔ کافی برای این عملیات ندارید.' };
    if (!this.purse.spend(cost, kind)) return { ok: false, reason: 'پرداخت انجام نشد.' };
    this.world = candidate;
    return { ok: true };
  }

  build(type: BuildableRoomType, x: number, y: number): CommandResult {
    return this.execute(this.buildCost(type), 'build', (world) => world.place(type, x, y));
  }

  dig(x: number, y: number): CommandResult {
    return this.execute(DIG_COST, 'dig', (world) => world.dig(x, y));
  }

  unlockFloor(): CommandResult {
    return this.execute(this.floorCost(), 'floor', (world) => world.unlockFloor());
  }

  upgradeAt(x: number, y: number): CommandResult {
    const room = this.world.getRoomAt(x, y);
    if (!room) return { ok: false, reason: 'ابتدا یک اتاق را انتخاب کنید.' };
    if (room.level >= 3) return { ok: false, reason: 'اتاق به حداکثر سطح رسیده است.' };
    const cost = getUpgradeCost(room.type, room.level);
    return this.execute(cost, 'upgrade', (world) => world.upgrade(room.id));
  }

  claimDemoBonus(): CommandResult {
    if (this.bonusClaimed) return { ok: false, reason: 'کمک‌هزینهٔ آزمایشی قبلاً دریافت شده است.' };
    if (!this.purse.credit(DEMO_BONUS_COINS, 'demo-bonus'))
      return { ok: false, reason: 'افزایش موجودی ممکن نیست.' };
    this.bonusClaimed = true;
    return { ok: true };
  }

  reset(): void {
    this.world = new BuildingLayout();
    this.purse = Wallet.create(STARTING_COINS);
    this.bonusClaimed = false;
  }

  snapshot(): GameSnapshot {
    return {
      schemaVersion: 2,
      base: this.world.snapshot(),
      wallet: this.purse.snapshot(),
      demoBonusClaimed: this.bonusClaimed
    };
  }
}

