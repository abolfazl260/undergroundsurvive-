import { RECREATION_CONFIG } from '../recreation/recreation';
import type { AssignmentBlock } from '../survivors/roster';
import { laboratoryFacilities, researchFacility, type LaboratoryFacility } from '../laboratory/laboratory';
import { SurvivorRoster, type SurvivorSnapshot } from '../survivors/roster';
import { KitchenProcessor, type CookingSnapshot, type CookingContext, type CookingBlock } from '../kitchen/kitchen';
import { GuardPosts } from '../defense/guardPost';
import { CapabilityGate, CAPABILITY_REASONS, type CommandCenterSnapshot } from '../command/commandCenter';
import { RadiationField, type RadiationSnapshot, type RadiationOccupant } from '../radiation/radiation';
import { ResearchScheduler, type ResearchSnapshot } from '../research/research';
import { ELEVATOR_DEFINITION } from '../world/elevators';
import { WaterProductionProcessor, type WaterSnapshot } from '../water/water';
import { AirSystem, ROOM_AIR_EMISSIONS, type AirSystemState } from '../air/air';
import { BuildingLayout, type BaseSnapshot } from '../building/layout';
import { Wallet, type WalletSnapshot } from './wallet';
import { ResourceEngine, type ResourceSnapshot } from './resources';
import { POWER_BALANCE, allocatePower, canActivateNetwork, canWire, installWire, legacyPower, removeWire,
  restorePower, setRoomPriority, starterPower, type PowerAllocation, type PowerPriority,
  type PowerSnapshot } from '../power/network';
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
  schemaVersion: 14;
  power: PowerSnapshot;
  air: AirSystemState;
  kitchen: CookingSnapshot;
  laboratories:LaboratoryFacility[];
  researchFacility:ReturnType<typeof researchFacility>;
  survivors: SurvivorSnapshot;
  guardPosts: ReturnType<GuardPosts['snapshot']>;
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
  survivors:SurvivorRoster;
  guardPosts:GuardPosts;
  private kitchenState = new KitchenProcessor();
  get kitchen(): KitchenProcessor { return this.kitchenState; }
  private cookingContext(): CookingContext {
    return { rooms: this.world.rooms, resources: this.resources, water: this.water,
      roster: this.survivors, technologies: this.research.snapshot().unlockedTechnologyIds };
  }
  cookingBlock(roomId: string, recipeId: string): CookingBlock | null {
    return this.kitchenState.block(roomId, recipeId, this.cookingContext());
  }
  startCooking(roomId: string, recipeId: string, operationId: string): CookingBlock | null {
    if(!this.powerStatus().activeRoomIds.includes(roomId))return 'power';
    return this.kitchenState.start(roomId, recipeId, operationId, this.cookingContext());
  }
  toggleCooking(roomId: string): boolean { return this.kitchenState.toggle(roomId); }
  cancelCooking(roomId: string): boolean { return this.kitchenState.cancel(roomId); }
  assignCook(id: string, roomId: string, op: string): string | null {
    const reason = this.survivors.assign(id, roomId, 'cook', op);
    const reasons = { survivor: 'بازمانده وجود ندارد.', room: 'آشپزخانه معتبر نیست.',
      busy: 'نیرو شغل دیگری دارد؛ ابتدا آزاد کنید.', capacity: 'ظرفیت اتاق پر است.',
      path: 'مسیر قابل‌عبور نیست.', duplicate: 'درخواست تکراری است.',satisfied:'روحیه کامل است.',power:'برق کافی نیست.' };
    return reason ? reasons[reason] : null;
  }
  assignGuard(id:string,roomId:string,op:string):string|null {
    const reason=this.survivors.assign(id,roomId,'guard',op);
    const reasons={survivor:'بازمانده وجود ندارد.',room:'پست معتبر نیست.',busy:'نیرو شغل دیگری دارد؛ ابتدا آزاد کنید.',capacity:'ظرفیت اتاق پر است.',path:'مسیر قابل‌عبور نیست.',duplicate:'درخواست تکراری است.',satisfied:'روحیه کامل است.',power:'برق کافی نیست.'};
    return reason?reasons[reason]:null;
  }

  private commandState=new CapabilityGate();
  get commandCenter():CapabilityGate{return this.commandState;}
  commandStatus(){
    const allowed = new Set(this.powerStatus().activeRoomIds);
    return this.commandState.status(this.world.rooms.filter(r=>allowed.has(r.id)),
      this.resources.snapshot().stock.power);
  }
  canBuild(type:BuildableRoomType,x:number,y:number):CommandResult {
    const placement=this.world.canPlace(type,x,y);if(!placement.ok)return placement;
    const capability=this.commandState.forRoom(type);
    const block=capability?this.commandState.block(capability,this.world.rooms,this.resources.snapshot().stock.power):null;
    return block?{ok:false,reason:CAPABILITY_REASONS[block]}:{ok:true};
  }
  moveRoom(id:string,x:number,y:number):CommandResult {this.commandStatus();const result=this.world.move(id,x,y);this.survivors.setLayout(this.world);this.kitchenState.sync(this.world.rooms);this.commandStatus();return result;}
  removeRoom(id:string):CommandResult {this.commandStatus();const result=this.world.remove(id);if(result.ok)this.powerState={...this.powerState,overrides:this.powerState.overrides.filter(o=>o.roomId!==id)};this.survivors.setLayout(this.world);this.commandStatus();return result;}
  private radiationState = new RadiationField();
  private radiationOccupants: readonly RadiationOccupant[] = [];
  get radiation():RadiationField {return this.radiationState;}
  setRadiationOccupants(occupants:readonly RadiationOccupant[]):void {this.radiationOccupants=occupants.map(p=>({...p}));}
  cleanupRadiation(x:number,y:number,id:string):boolean {return this.radiationState.cleanup(x,y,id,n=>this.wallet.spend(n,'radiation'));}
  installRadiationFilter(roomId:string,id:string):boolean {return this.radiationState.installFilter(roomId,this.world.rooms,id,n=>this.wallet.spend(n,'radiation'));}
  private researchState = new ResearchScheduler();
  get research():ResearchScheduler {return this.researchState;}
  assignRecreation(id:string,roomId:string,op:string):AssignmentBlock|null {
    if(this.resources.snapshot().stock.power<RECREATION_CONFIG.activationPower)return 'power';
    const reason=this.survivors.assign(id,roomId,'recreation',op);
    if(!reason)this.resources.spendPower(RECREATION_CONFIG.activationPower);
    return reason;
  }
  laboratories():LaboratoryFacility[] {
    this.survivors.reconcile(this.resources.snapshot().stock.power);
    const allowed = new Set(this.powerStatus().activeRoomIds);
    return laboratoryFacilities(this.world.rooms.filter(r=>allowed.has(r.id)),
      this.survivors.assignments,this.resources.snapshot().stock.power);
  }
  researchFacility() {return researchFacility(this.laboratories());}
  assignScientist(id:string,roomId:string,op:string) {return this.survivors.assign(id,roomId,'scientist',op);}

  startResearch(id:string,operationId:string):boolean {
    return this.researchState.start(id,operationId,this.researchFacility(),this.wallet.balance,n=>this.purse.spend(n,'research'));
  }
  private airState = new AirSystem();
  get air(): AirSystem { return this.airState; }
  toggleVent(id: string, operationId: string): boolean {
    this.airState.sync(this.world.rooms);
    return this.airState.toggle(id, operationId);
  }
  repairVent(id: string, operationId: string): boolean {
    this.airState.sync(this.world.rooms);
    return this.airState.repair(id, operationId, coins => this.purse.spend(coins, 'air'));
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
  private powerState: PowerSnapshot;

  private constructor(layout: BuildingLayout, wallet: Wallet, claimed = false,
                      resources = ResourceEngine.create(), achievements = new AchievementTracker(), power = starterPower()) {
    this.world = layout;
    this.survivors=new SurvivorRoster(layout);
    this.guardPosts=new GuardPosts(()=>this.world.rooms,this.survivors,()=>this.resources.snapshot().stock.power);
    this.purse = wallet;
    this.bonusClaimed = claimed;
    this.resourceState = resources;
    this.kitchenState.sync(layout.rooms);
    this.achievementState = achievements;
    this.powerState = power;
    this.commandStatus();
  }

  static create(): GameSession {
    return new GameSession(new BuildingLayout(), Wallet.create(STARTING_COINS));
  }

  static restore(raw: unknown): GameSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Partial<Omit<GameSnapshot, 'schemaVersion'>> & { schemaVersion?: number };
    const version=value.schemaVersion;
    if(typeof version!=='number'||!Number.isInteger(version)||version<2||version>14||typeof value.demoBonusClaimed!=='boolean')return null;
    const world = BuildingLayout.restore(value.base);
    const wallet = Wallet.restore(value.wallet);
    const resources = (version>=3)
      ? ResourceEngine.restore(value.resources) : ResourceEngine.create();
    const achievements = (version>=4)
      ? AchievementTracker.restore(value.achievements) : new AchievementTracker();
    if (!world || !wallet || !resources || !achievements) return null;
    resources.reconcileCapacity(world.rooms);
    const bonusCount = wallet.transactions.filter((t) => t.kind === 'demo-bonus').length;
    if ((value.demoBonusClaimed && bonusCount !== 1) ||
        (!value.demoBonusClaimed && bonusCount !== 0)) return null;
    const power = version >= 14 ? restorePower(value.power, world.rooms, world.terrain) : legacyPower();
    if (!power) return null;
    const session = new GameSession(world, wallet, value.demoBonusClaimed, resources, achievements, power);
    if (version>=5) {
      const water = WaterProductionProcessor.restore(value.water);
      if (!water) return null;
      session.waterState = water;
    }
    if(version>=6) {
      const research=ResearchScheduler.restore(value.research);if(!research)return null;
      if(research.snapshot().nowMs!==resources.tickCount*5000)return null;
      session.researchState=research;
    } else session.researchState=ResearchScheduler.restore({...session.researchState.snapshot(),nowMs:resources.tickCount*5000})!;
    if(!session.researchState)return null;
    if(version>=7) {
      const radiation=RadiationField.restore(value.radiation);if(!radiation||radiation.snapshot().nowMs!==resources.tickCount*5000)return null;
      session.radiationState=radiation;
    } else session.radiationState=RadiationField.restore({...session.radiationState.snapshot(),nowMs:resources.tickCount*5000})!;
    if(!session.radiationState)return null;
    if(version>=8) {
      const command=CapabilityGate.restore(value.commandCenter);if(!command)return null;
      session.commandState=command;
    }
    if(version>=9) {
      const survivors=SurvivorRoster.restore(world,value.survivors,resources.tickCount*5000+resources.snapshot().elapsedMs);if(!survivors)return null;
      session.survivors=survivors;
      session.guardPosts=new GuardPosts(()=>session.world.rooms,survivors,()=>session.resources.snapshot().stock.power);
      if(!session.guardPosts.restore(value.guardPosts))return null;
    }
    if(version<9)session.survivors.initializeLegacyClock(resources.tickCount*5000+resources.snapshot().elapsedMs);
    const survivorTime=session.survivors.snapshot();
    if(Math.abs(survivorTime.nowMs+survivorTime.remainderMs-(resources.tickCount*5000+resources.snapshot().elapsedMs))>0.1)return null;
    if (version >= 11) {
      const kitchen = KitchenProcessor.restore(value.kitchen);
      if (!kitchen) return null;
      // A saved paid cycle cannot point to a demolished or altered room.
      if (kitchen.snapshot().cycles.some(c => !world.rooms.some(r => r.id === c.roomId && r.type === 'kitchen'))) return null;
      session.kitchenState = kitchen;
    }
    if (version >= 13) {
      const air = AirSystem.restore(value.air);
      if (!air || air.snapshot().nowMs !== resources.tickCount * 5000) return null;
      session.airState = air;
    } else {
      const seed = {...session.airState.snapshot(), nowMs: resources.tickCount * 5000};
      session.airState = AirSystem.restore(seed)!;
    }
    session.airState.sync(world.rooms);
    session.kitchenState.sync(world.rooms);
    session.survivors.reconcile(session.resources.snapshot().stock.power);
    session.commandStatus();
    session.waterState.sync(world.rooms);
    return session;
  }

  // Existing v1 browser saves contain only a layout; migrate without losing rooms.
  static fromSave(raw: unknown): GameSession {
    return GameSession.restore(raw) ??
      new GameSession(BuildingLayout.restore(raw) ?? new BuildingLayout(), Wallet.create(STARTING_COINS),
        false, ResourceEngine.create(), new AchievementTracker(),
        BuildingLayout.restore(raw) ? legacyPower() : starterPower());
  }

  get layout(): BuildingLayout { return this.world; }
  get wallet(): Wallet { return this.purse; }
  get resources(): ResourceEngine { return this.resourceState; }
  get demoBonusClaimed(): boolean { return this.bonusClaimed; }
  get power(): PowerSnapshot { return { ...this.powerState,
    cables: this.powerState.cables.map(c => ({...c})),
    overrides: this.powerState.overrides.map(o => ({...o})) }; }
  powerStatus(): PowerAllocation {
    return allocatePower(this.powerState, this.world.rooms, this.researchState.modifiers());
  }
  /** Cable operations validate geometry and funds before mutating anything. */
  installCable(x: number, y: number, riser = false): CommandResult {
    const reason = canWire(this.powerState, this.world.terrain, x, y, riser);
    if (reason) return { ok:false, reason };
    const cost = riser ? POWER_BALANCE.riserCost : POWER_BALANCE.cableCost;
    if (!this.purse.canAfford(cost)) return {ok:false,reason:'سکهٔ کافی برای کابل ندارید.'};
    const next = installWire(this.powerState, this.world.terrain, x, y, riser);
    if (!next || !this.purse.spend(cost,'build')) return {ok:false,reason:'نصب کابل ممکن نیست.'};
    this.powerState = next;
    return {ok:true};
  }
  removeCable(x: number, y: number): CommandResult {
    const next = removeWire(this.powerState,x,y);
    if (!next) return {ok:false,reason:'در این خانه کابل وجود ندارد.'};
    this.powerState = next;
    return {ok:true};
  }
  prioritizeRoom(id: string, priority: PowerPriority): CommandResult {
    const room = this.world.rooms.find(r => r.id === id);
    if (!room) return {ok:false,reason:'اتاق موردنظر وجود ندارد.'};
    const next = setRoomPriority(this.powerState, room, priority);
    if (!next) return {ok:false,reason:'تغییر اولویت بیش از یک سطح مجاز نیست.'};
    this.powerState = next;
    return {ok:true};
  }
  activatePowerNetwork(): CommandResult {
    if (this.powerState.mode === 'physical') return {ok:false,reason:'شبکهٔ فیزیکی فعال است.'};
    if (!canActivateNetwork(this.powerState,this.world.rooms,this.researchState.modifiers()))
      return {ok:false,reason:'ابتدا تمام اتاق‌ها را با کابل به نیروگاه متصل کنید.'};
    this.powerState = {...this.powerState,mode:'physical'};
    return {ok:true};
  }

  /** Simulation advances only when the Phaser scene is active (not paused/offline). */
  advanceTime(deltaMs: number): number {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
    let remaining = Math.min(deltaMs, 60_000), ticks = 0;
    while (remaining > 0) {
      const step = Math.min(remaining, this.resources.remainingMs);
      this.survivors.advance(step,this.resources.snapshot().stock.power);
      const completed = this.resourceState.advance(step, this.world.rooms,this.researchState.modifiers(),this.powerStatus());
      ticks += completed;
      if (completed) {
        const poweredRooms = new Set(this.powerStatus().activeRoomIds);
        this.waterState.advance(5000, this.world.rooms, this.powerAdapter(), poweredRooms);
        this.kitchenState.advance(5000, this.cookingContext(), poweredRooms);
        this.researchState.advanceTo(this.resources.tickCount*5000,this.researchFacility());
        // Water, kitchen and research get their power before ventilation.
        this.airState.advanceTo(this.resources.tickCount * 5000, this.world.rooms,
          this.survivors.survivors.length, ROOM_AIR_EMISSIONS.emissions(this.world.rooms), this.powerAdapter(), poweredRooms);
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
    this.survivors.setLayout(this.world);
    this.kitchenState.sync(this.world.rooms);
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
    this.kitchenState = new KitchenProcessor();
    this.airState = new AirSystem();
    this.world = new BuildingLayout();
    this.survivors=new SurvivorRoster(this.world);
    this.guardPosts=new GuardPosts(()=>this.world.rooms,this.survivors,()=>this.resources.snapshot().stock.power);
    this.purse = Wallet.create(STARTING_COINS);
    this.bonusClaimed = false;
    this.resourceState = ResourceEngine.create();
    this.achievementState = new AchievementTracker();
    this.powerState = starterPower();
  }

  snapshot(): GameSnapshot {
    this.resourceState.reconcileCapacity(this.world.rooms);
    this.commandStatus();
    this.waterState.sync(this.world.rooms);
    this.kitchenState.sync(this.world.rooms);
    this.airState.sync(this.world.rooms);
    this.radiationState.reconcileRooms(this.world.rooms);
    this.survivors.reconcile(this.resources.snapshot().stock.power);
    const base = this.world.snapshot();
    const wallet = this.purse.snapshot();
    const resources = this.resourceState.snapshot();
    this.achievementState.evaluate({ base, wallet, resources });
    return {
      schemaVersion: 14,
      power: this.power,
      air: this.airState.snapshot(),
      kitchen: this.kitchenState.snapshot(),
      laboratories:this.laboratories(),
      researchFacility:this.researchFacility(),
      survivors:this.survivors.snapshot(),
      guardPosts:this.guardPosts.snapshot(),
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

