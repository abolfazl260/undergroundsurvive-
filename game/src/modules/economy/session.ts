import { BuildingLayout, type BaseSnapshot } from '../building/layout';
import { Wallet, type WalletSnapshot } from './wallet';
import { ResourceEngine, type ResourceSnapshot } from './resources';
import {
  STARTING_COINS, DEMO_BONUS_COINS, DIG_COST,
  getBuildCost, getFloorCost, getUpgradeCost
} from './pricing';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../building/catalog';
import { getRoomPerformance, MAX_ROOM_LEVEL, type RoomPerformance } from '../building/upgrades';
import type { PlacementResult } from '../building/placement';
import { AchievementTracker, type AchievementSnapshot } from '../achievements/achievements';

export interface GameSnapshot {
  schemaVersion: 4;
  base: BaseSnapshot;
  wallet: WalletSnapshot;
  resources: ResourceSnapshot;
  demoBonusClaimed: boolean;
  achievements: AchievementSnapshot;
}

export type CommandResult = PlacementResult;
export interface UpgradeDetails {
  readonly id: string;
  readonly label: string;
  readonly level: number;
  readonly current: RoomPerformance;
  readonly next: RoomPerformance | null;
  readonly cost: number | null;
}
type SpendKind = 'build' | 'dig' | 'floor' | 'upgrade';

export class GameSession {
  private world: BuildingLayout;
  private purse: Wallet;
  private bonusClaimed = false;
  private resourceState: ResourceEngine;
  private achievementState: AchievementTracker;

  private constructor(layout: BuildingLayout, wallet: Wallet, claimed = false,
                      resources = ResourceEngine.create(), achievements = new AchievementTracker()) {
    this.world = layout;
    this.purse = wallet;
    this.bonusClaimed = claimed;
    this.resourceState = resources;
    this.achievementState = achievements;
  }

  static create(): GameSession {
    return new GameSession(new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  static restore(raw: unknown): GameSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Partial<Omit<GameSnapshot, 'schemaVersion'>> & { schemaVersion?: number };
    if ((value.schemaVersion !== 2 && value.schemaVersion !== 3 && value.schemaVersion !== 4) ||
        typeof value.demoBonusClaimed !== 'boolean') return null;
    const world = BuildingLayout.restore(value.base);
    const wallet = Wallet.restore(value.wallet);
    const resources = (value.schemaVersion === 3 || value.schemaVersion === 4)
      ? ResourceEngine.restore(value.resources) : ResourceEngine.create();
    const achievements = value.schemaVersion === 4
      ? AchievementTracker.restore(value.achievements) : new AchievementTracker();
    if (!world || !wallet || !resources || !achievements) return null;
    resources.reconcileCapacity(world.rooms);
    const bonusCount = wallet.transactions.filter((t) => t.kind === 'demo-bonus').length;
    if ((value.demoBonusClaimed && bonusCount !== 1) ||
        (!value.demoBonusClaimed && bonusCount !== 0)) return null;
    return new GameSession(world, wallet, value.demoBonusClaimed, resources, achievements);
  }

  // Existing v1 browser saves contain only a layout; migrate without losing rooms.
  static fromSave(raw: unknown): GameSession {
    return GameSession.restore(raw) ??
      new GameSession(BuildingLayout.restore(raw) ?? new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  get layout(): BuildingLayout { return this.world; }
  get wallet(): Wallet { return this.purse; }
  get resources(): ResourceEngine { return this.resourceState; }
  get demoBonusClaimed(): boolean { return this.bonusClaimed; }

  /** Simulation advances only when the Phaser scene is active (not paused/offline). */
  advanceTime(deltaMs: number): number {
    return this.resourceState.advance(deltaMs, this.world.rooms);
  }

  buildCost(type: BuildableRoomType): number { return getBuildCost(type); }
  digCost(): number { return DIG_COST; }
  floorCost(): number { return getFloorCost(this.world.terrain.highestFloor); }

  upgradeDetails(id: string): UpgradeDetails | null {
    const room = this.world.rooms.find((r) => r.id === id);
    if (!room) return null;
    const available = room.level < MAX_ROOM_LEVEL;
    return {
      id: room.id, label: ROOM_DEFINITIONS[room.type].label, level: room.level,
      current: getRoomPerformance(room.type, room.level),
      next: available ? getRoomPerformance(room.type, room.level + 1) : null,
      cost: available ? getUpgradeCost(room.type, room.level) : null
    };
  }

  upgradeCostAt(x: number, y: number): number | null {
    const room = this.world.getRoomAt(x, y);
    return room ? this.upgradeDetails(room.id)?.cost ?? null : null;
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

  upgradeRoom(id: string): CommandResult {
    const details = this.upgradeDetails(id);
    if (!details) return { ok: false, reason: 'اتاق انتخاب‌شده وجود ندارد.' };
    if (details.cost === null) return { ok: false, reason: 'اتاق به حداکثر سطح رسیده است.' };
    // The session recalculates the price; a previously shown preview is not trusted.
    return this.execute(details.cost, 'upgrade', (world) => world.upgrade(id));
  }

  upgradeAt(x: number, y: number): CommandResult {
    const room = this.world.getRoomAt(x, y);
    return room ? this.upgradeRoom(room.id) :
      { ok: false, reason: 'ابتدا یک اتاق را انتخاب کنید.' };
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
    this.resourceState = ResourceEngine.create();
    this.achievementState = new AchievementTracker();
  }

  snapshot(): GameSnapshot {
    this.resourceState.reconcileCapacity(this.world.rooms);
    const base = this.world.snapshot();
    const wallet = this.purse.snapshot();
    const resources = this.resourceState.snapshot();
    this.achievementState.evaluate({ base, wallet, resources });
    return {
      schemaVersion: 4,
      base, wallet, resources,
      demoBonusClaimed: this.bonusClaimed,
      achievements: this.achievementState.snapshot()
    };
  }
}

