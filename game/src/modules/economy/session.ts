import { CapabilityGate, CAPABILITY_REASONS, type CommandCenterSnapshot } from '../command/commandCenter';
import { RadiationField, type RadiationSnapshot, type RadiationOccupant } from '../radiation/radiation';
import { ResearchScheduler, type ResearchSnapshot } from '../research/research';
import { ELEVATOR_DEFINITION } from '../world/elevators';
import { WaterProductionProcessor, type WaterSnapshot } from '../water/water';
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
import { LEGACY_SURFACE_READ_ONLY_REASON } from '../building/constructionPolicy';

export interface GameSnapshot {
  schemaVersion: 8;
  commandCenter: CommandCenterSnapshot;
  radiation: RadiationSnapshot;
  research: ResearchSnapshot;
  water: WaterSnapshot;
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
  readonly blockedReason: string | null;
}
type SpendKind = 'build' | 'dig' | 'floor' | 'upgrade';

export class GameSession {
  private commandState=new CapabilityGate();
  get commandCenter():CapabilityGate{return this.commandState;}
  commandStatus(){return this.commandState.status(this.world.rooms,this.resources.snapshot().stock.power);}
  canBuild(type:BuildableRoomType,x:number,y:number):CommandResult {
    const placement=this.world.canPlace(type,x,y);if(!placement.ok)return placement;
    const capability=this.commandState.forRoom(type);
    const block=capability?this.commandState.block(capability,this.world.rooms,this.resources.snapshot().stock.power):null;
    return block?{ok:false,reason:CAPABILITY_REASONS[block]}:{ok:true};
  }
  moveRoom(id:string,x:number,y:number):CommandResult {this.commandStatus();const result=this.world.move(id,x,y);this.commandStatus();return result;}
  removeRoom(id:string):CommandResult {this.commandStatus();const result=this.world.remove(id);this.commandStatus();return result;}
  private radiationState = new RadiationField();
  private radiationOccupants: readonly RadiationOccupant[] = [];
  get radiation():RadiationField {return this.radiationState;}
  setRadiationOccupants(occupants:readonly RadiationOccupant[]):void {this.radiationOccupants=occupants.map(p=>({...p}));}
  cleanupRadiation(x:number,y:number,id:string):boolean {return this.radiationState.cleanup(x,y,id,n=>this.wallet.spend(n,'radiation'));}
  installRadiationFilter(roomId:string,id:string):boolean {return this.radiationState.installFilter(roomId,this.world.rooms,id,n=>this.wallet.spend(n,'radiation'));}
  private researchState = new ResearchScheduler();
  get research():ResearchScheduler {return this.researchState;}
  researchFacility() { return {level:Math.max(0,...this.world.rooms.filter(r=>r.type==='laboratory').map(r=>r.level)),powered:this.resources.snapshot().stock.power>0}; }
  startResearch(id:string,operationId:string):boolean {
    return this.researchState.start(id,operationId,this.researchFacility(),this.wallet.balance,n=>this.purse.spend(n,'research'));
  }
  private waterState = new WaterProductionProcessor();
  get water(): WaterProductionProcessor { return this.waterState; }
  private powerAdapter() { return { available: () => this.resources.snapshot().stock.power, spend: (n: number) => this.resources.spendPower(n) }; }
  collectWater(id: string): boolean { return this.waterState.collect(id, this.world.rooms, this.powerAdapter()); }
  toggleWater(id: string): boolean { this.waterState.sync(this.world.rooms); return this.waterState.toggle(id); }
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
    this.commandStatus();
  }

  static create(): GameSession {
    return new GameSession(new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  static restore(raw: unknown): GameSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Partial<Omit<GameSnapshot, 'schemaVersion'>> & { schemaVersion?: number };
    if ((value.schemaVersion !== 2 && value.schemaVersion !== 3 && value.schemaVersion !== 4 && value.schemaVersion !== 5 && value.schemaVersion !== 6 && value.schemaVersion !== 7 && value.schemaVersion !== 8) ||
        typeof value.demoBonusClaimed !== 'boolean') return null;
    const world = BuildingLayout.restore(value.base);
    const wallet = Wallet.restore(value.wallet);
    const resources = (value.schemaVersion === 3 || value.schemaVersion === 4 || value.schemaVersion === 5 || value.schemaVersion === 6 || value.schemaVersion === 7 || value.schemaVersion === 8)
      ? ResourceEngine.restore(value.resources) : ResourceEngine.create();
    const achievements = (value.schemaVersion === 4 || value.schemaVersion === 5 || value.schemaVersion === 6 || value.schemaVersion === 7 || value.schemaVersion === 8)
      ? AchievementTracker.restore(value.achievements) : new AchievementTracker();
    if (!world || !wallet || !resources || !achievements) return null;
    resources.reconcileCapacity(world.rooms);
    const bonusCount = wallet.transactions.filter((t) => t.kind === 'demo-bonus').length;
    if ((value.demoBonusClaimed && bonusCount !== 1) ||
        (!value.demoBonusClaimed && bonusCount !== 0)) return null;
    const session = new GameSession(world, wallet, value.demoBonusClaimed, resources, achievements);
    if (value.schemaVersion === 5 || value.schemaVersion === 6 || value.schemaVersion === 7 || value.schemaVersion === 8) {
      const water = WaterProductionProcessor.restore(value.water);
      if (!water) return null;
      session.waterState = water;
    }
    if(value.schemaVersion===6 || value.schemaVersion===7 || value.schemaVersion===8) {
      const research=ResearchScheduler.restore(value.research);if(!research)return null;
      if(research.snapshot().nowMs!==resources.tickCount*5000)return null;
      session.researchState=research;
    } else session.researchState=ResearchScheduler.restore({...session.researchState.snapshot(),nowMs:resources.tickCount*5000})!;
    if(!session.researchState)return null;
    if(value.schemaVersion===7 || value.schemaVersion===8) {
      const radiation=RadiationField.restore(value.radiation);if(!radiation||radiation.snapshot().nowMs!==resources.tickCount*5000)return null;
      session.radiationState=radiation;
    } else session.radiationState=RadiationField.restore({...session.radiationState.snapshot(),nowMs:resources.tickCount*5000})!;
    if(!session.radiationState)return null;
    if(value.schemaVersion===8) {
      const command=CapabilityGate.restore(value.commandCenter);if(!command)return null;
      session.commandState=command;
    }
    session.commandStatus();
    session.waterState.sync(world.rooms);
    return session;
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
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
    let remaining = Math.min(deltaMs, 60_000), ticks = 0;
    while (remaining > 0) {
      const step = Math.min(remaining, this.resources.remainingMs);
      const completed = this.resourceState.advance(step, this.world.rooms,this.researchState.modifiers());
      ticks += completed;
      if (completed) {
        this.waterState.advance(5000, this.world.rooms, this.powerAdapter());
        this.researchState.advanceTo(this.resources.tickCount*5000,this.researchFacility());
        this.radiationState.advanceTo(this.resources.tickCount*5000,this.radiationState.world(this.world.terrain,this.world.rooms),this.radiationOccupants);
        if(this.resources.tickCount%24===0)this.radiationState.triggerSurge('leaking-pipe');
      }
      remaining -= step;
    }
    return ticks;
  }

  buildCost(type: BuildableRoomType): number { return getBuildCost(type); }
  digCost(): number { return DIG_COST; }
  floorCost(): number { return getFloorCost(this.world.terrain.highestFloor); }

  upgradeDetails(id: string): UpgradeDetails | null {
    const room = this.world.rooms.find((r) => r.id === id);
    if (!room) return null;
    const blockedReason = !this.world.canEditRoom(room) ? LEGACY_SURFACE_READ_ONLY_REASON :
      room.type==='command'&&!this.commandStatus().powered ? 'فرماندهی برق کافی ندارد.' : null;
    const available = room.level < MAX_ROOM_LEVEL && !blockedReason;
    return {
      id: room.id, label: ROOM_DEFINITIONS[room.type].label, level: room.level,
      current: getRoomPerformance(room.type, room.level),
      next: available ? getRoomPerformance(room.type, room.level + 1) : null,
      cost: available ? getUpgradeCost(room.type, room.level) : null,
      blockedReason
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
    const valid=this.canBuild(type,x,y);if(!valid.ok)return valid;
    return this.execute(this.buildCost(type), 'build', (world) => world.place(type, x, y));
  }

  dig(x: number, y: number): CommandResult {
    return this.execute(DIG_COST, 'dig', (world) => world.dig(x, y));
  }

  buildElevator(x:number,y:number): CommandResult {
    return this.execute(ELEVATOR_DEFINITION.cost,'floor',world=>world.buildElevator(x,y));
  }
  unlockFloor(): CommandResult {
    return this.execute(this.floorCost(), 'floor', (world) => world.unlockFloor());
  }

  upgradeRoom(id: string, operationId?: string): CommandResult {
    const details = this.upgradeDetails(id);
    if (!details) return { ok: false, reason: 'اتاق انتخاب‌شده وجود ندارد.' };
    if (!this.world.canEditRoom(this.world.rooms.find((room) => room.id === id)!))
      return { ok: false, reason: LEGACY_SURFACE_READ_ONLY_REASON };
    if (details.cost === null) return { ok: false, reason: details.blockedReason ?? 'اتاق به حداکثر سطح رسیده است.' };
    const isCommand=this.world.rooms.find(r=>r.id===id)?.type==='command';
    if(isCommand && (!this.commandStatus().powered || (operationId!==undefined&&this.commandState.hasOperation(operationId))))
      return {ok:false,reason:'ارتقای فرماندهی به برق و درخواست جدید نیاز دارد.'};
    // The session recalculates the price; a previously shown preview is not trusted.
    const result=this.execute(details.cost, 'upgrade', (world) => world.upgrade(id));
    if(result.ok&&isCommand) {if(operationId!==undefined)this.commandState.recordOperation(operationId);this.commandStatus();}
    return result;
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
    this.commandState=new CapabilityGate();
    this.radiationState = new RadiationField();
    this.radiationOccupants = [];
    this.researchState = new ResearchScheduler();
    this.waterState = new WaterProductionProcessor();
    this.world = new BuildingLayout();
    this.purse = Wallet.create(STARTING_COINS);
    this.bonusClaimed = false;
    this.resourceState = ResourceEngine.create();
    this.achievementState = new AchievementTracker();
  }

  snapshot(): GameSnapshot {
    this.resourceState.reconcileCapacity(this.world.rooms);
    this.commandStatus();
    this.waterState.sync(this.world.rooms);
    this.radiationState.reconcileRooms(this.world.rooms);
    const base = this.world.snapshot();
    const wallet = this.purse.snapshot();
    const resources = this.resourceState.snapshot();
    this.achievementState.evaluate({ base, wallet, resources });
    return {
      schemaVersion: 8,
      commandCenter: this.commandState.snapshot(),
      radiation: this.radiationState.snapshot(),
      research: this.researchState.snapshot(),
      water: this.waterState.snapshot(),
      base, wallet, resources,
      demoBonusClaimed: this.bonusClaimed,
      achievements: this.achievementState.snapshot()
    };
  }
}

