import type { Room } from '../building/placement';

/** All figures are balancing units per 5-second game tick, not real-world measurements. */
export const AIR_CONFIG = {
  schemaVersion: 1, typeId: 'ventilation', tickMs: 5_000,
  minQuality: 0, maxQuality: 100, initialQuality: 100,
  healthyThreshold: 75, criticalThreshold: 40,
  baseDecay: 0.24, perResidentDecay: 0.12, perActiveRoomEmission: 0.035,
  industrialEmission: 0.15, overloadDecay: 0.10, purificationPerLevel: 1.6,
  capacityBase: 5, capacityPerLevel: 3, powerBase: 1,
  maxEmissions: 20, maxPopulation: 100, maxUnits: 160,
  wearPerTick: 0.01, repairCoins: 60,
  efficiencyWarning: 0.9, efficiencyCritical: 0.7,
  welfareWarning: 0.9, welfareCritical: 0.65,
} as const;

export type AirStatus = 'healthy' | 'warning' | 'critical';
export type AirReason = 'stable' | 'no-vents' | 'disabled' | 'damaged' | 'power' | 'overload' | 'emissions';
export interface VentState {
  id: string; enabled: boolean; health: number; powered: boolean;
}
export interface AirSystemState {
  schemaVersion: 1; quality: number; nowMs: number; vents: VentState[];
  coverage: number; population: number; powerUsed: number; emissions: number;
  reason: AirReason; operations: string[];
}
export interface VentUnit extends VentState { level: number }
export interface AirInput { quality: number; units: readonly VentUnit[] }
export interface AirStep {
  quality: number; coverage: number; powerUsed: number; poweredIds: string[];
  reason: AirReason;
}
export interface AirPower { available(): number; spend(amount: number): boolean }
export interface AirModifiers { efficiency: number; welfare: number }
export interface AirEmissionsAdapter { emissions(rooms: readonly Room[]): number }

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
const rounded = (n: number): number => Math.round(n * 100) / 100;
export const airStatus = (quality: number): AirStatus =>
  quality < AIR_CONFIG.criticalThreshold ? 'critical' : quality < AIR_CONFIG.healthyThreshold ? 'warning' : 'healthy';

/** Only a projection: future welfare/production integrations can explicitly consume these modifiers. */
export function airModifiers(quality: number): AirModifiers {
  const status = airStatus(quality);
  return {
    efficiency: status === 'critical' ? AIR_CONFIG.efficiencyCritical : status === 'warning' ? AIR_CONFIG.efficiencyWarning : 1,
    welfare: status === 'critical' ? AIR_CONFIG.welfareCritical : status === 'warning' ? AIR_CONFIG.welfareWarning : 1,
  };
}

export const ROOM_AIR_EMISSIONS: AirEmissionsAdapter = {
  emissions(rooms) {
    return rounded(Math.min(AIR_CONFIG.maxEmissions, rooms.length * AIR_CONFIG.perActiveRoomEmission +
      rooms.filter(room => room.type === 'mine' || room.type === 'workshop').length * AIR_CONFIG.industrialEmission));
  },
};
export function ventCapacity(level: number): number { return AIR_CONFIG.capacityBase + (level - 1) * AIR_CONFIG.capacityPerLevel; }
export function ventPower(level: number): number { return AIR_CONFIG.powerBase + (level - 1); }

/** Pure, bounded air calculation. Caller supplies a deterministic per-tick power budget. */
export function simulateAir(
  dt: number, population: number, emissions: number, vents: AirInput, power: number
): AirStep {
  if (!Number.isFinite(dt) || dt < 0 || !Number.isSafeInteger(population) ||
      population < 0 || population > AIR_CONFIG.maxPopulation ||
      !Number.isFinite(emissions) || emissions < 0 || emissions > AIR_CONFIG.maxEmissions ||
      !Number.isFinite(power) || power < 0 || !Number.isFinite(vents.quality) ||
      vents.quality < 0 || vents.quality > 100) throw new Error('Invalid air simulation input');
  const active: VentUnit[] = [];
  let budget = Math.floor(power), powerUsed = 0;
  for (const vent of [...vents.units].sort((a,b) => a.id.localeCompare(b.id))) {
    if (!vent.enabled || vent.health <= 0) continue;
    const cost = ventPower(vent.level);
    if (budget >= cost) { budget -= cost; powerUsed += cost; active.push(vent); }
  }
  const coverage = active.reduce((n,vent) => n + ventCapacity(vent.level) * vent.health / 100, 0);
  const shortage = Math.max(0, population - coverage);
  const decay = AIR_CONFIG.baseDecay + population * AIR_CONFIG.perResidentDecay +
    emissions + shortage * AIR_CONFIG.overloadDecay;
  const purification = active.reduce((n,vent) =>
    n + AIR_CONFIG.purificationPerLevel * vent.level * vent.health / 100, 0);
  const change = (purification - decay) * (dt / AIR_CONFIG.tickMs);
  const quality = rounded(clamp(vents.quality + change, AIR_CONFIG.minQuality, AIR_CONFIG.maxQuality));
  const reason: AirReason = active.length === 0
    ? vents.units.length === 0 ? 'no-vents'
      : vents.units.every(v => !v.enabled) ? 'disabled'
      : vents.units.every(v => !v.enabled || v.health <= 0) ? 'damaged' : 'power'
    : shortage > 0 ? 'overload' : purification < decay && emissions > 0 ? 'emissions' : 'stable';
  return { quality, coverage: rounded(coverage), powerUsed,
    poweredIds: active.map(v => v.id), reason };
}

export class AirSystem {
  private state: AirSystemState = {
    schemaVersion: 1, quality: AIR_CONFIG.initialQuality, nowMs: 0, vents: [],
    coverage: 0, population: 0, powerUsed: 0, emissions: 0, reason: 'no-vents', operations: [],
  };
  snapshot(): AirSystemState { return structuredClone(this.state); }

  /** Preserve enable/health choices on move, upgrade and reload; discard demolished units. */
  sync(rooms: readonly Room[]): void {
    this.state.vents = rooms.filter(r => r.type === AIR_CONFIG.typeId)
      .map(r => {
        const existing = this.state.vents.find(v => v.id === r.id);
        return existing ? { ...existing } : { id: r.id, enabled: true, health: 100, powered: false };
      }).sort((a,b) => a.id.localeCompare(b.id));
  }

  toggle(id: string, operationId: string): boolean {
    const vent = this.state.vents.find(v => v.id === id);
    if (!vent || !this.record(operationId)) return false;
    vent.enabled = !vent.enabled; vent.powered = false;
    return true;
  }
  damage(id: string, amount: number, operationId: string): boolean {
    const vent = this.state.vents.find(v => v.id === id);
    if (!vent || !Number.isFinite(amount) || amount <= 0 || amount > 100 || !this.record(operationId)) return false;
    vent.health = rounded(clamp(vent.health - amount, 0, 100));
    if (vent.health === 0) vent.powered = false;
    return true;
  }
  repair(id: string, operationId: string, spend: (coins: number) => boolean): boolean {
    const vent = this.state.vents.find(v => v.id === id);
    if (!vent || vent.health >= 100 || !this.canRecord(operationId) || !spend(AIR_CONFIG.repairCoins)) return false;
    vent.health = 100; this.record(operationId); return true;
  }
  private canRecord(id: string): boolean {
    return !!id && !this.state.operations.includes(id) && this.state.operations.length < 5000;
  }
  private record(id: string): boolean {
    if (!this.canRecord(id)) return false;
    this.state.operations.push(id); return true;
  }

  /** Called after the resource recipe tick, exactly once per 5-second simulation tick. */
  advanceTo(nowMs: number, rooms: readonly Room[], population: number, emissions: number, power: AirPower, poweredRooms?: ReadonlySet<string>): number {
    if (!Number.isSafeInteger(nowMs) || nowMs < this.state.nowMs ||
      nowMs - this.state.nowMs > 60_000 || nowMs % AIR_CONFIG.tickMs !== 0 ||
      this.state.nowMs % AIR_CONFIG.tickMs !== 0) return 0;
    this.sync(rooms);
    let ticks = 0;
    while (this.state.nowMs < nowMs) {
      const units = this.state.vents.map(vent => ({
        ...vent, enabled: vent.enabled && (!poweredRooms || poweredRooms.has(vent.id)),
        level: rooms.find(r => r.id === vent.id)!.level,
      }));
      const result = simulateAir(AIR_CONFIG.tickMs, population, emissions,
        { quality: this.state.quality, units }, power.available());
      if (result.powerUsed > 0 && !power.spend(result.powerUsed)) {
        // Re-evaluate against zero power without consuming resources or double crediting air.
        Object.assign(result, simulateAir(AIR_CONFIG.tickMs, population, emissions,
          { quality: this.state.quality, units }, 0));
      }
      this.state.quality = result.quality;
      this.state.coverage = result.coverage;
      this.state.powerUsed = result.powerUsed;
      this.state.reason = result.reason;
      this.state.population = population;
      this.state.emissions = emissions;
      const powered = new Set(result.poweredIds);
      for (const vent of this.state.vents) {
        vent.powered = powered.has(vent.id);
        if (vent.powered) vent.health = rounded(clamp(vent.health - AIR_CONFIG.wearPerTick, 0, 100));
      }
      this.state.nowMs += AIR_CONFIG.tickMs;
      ticks++;
    }
    return ticks;
  }

  static restore(raw: unknown): AirSystem | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as AirSystemState;
    if (s.schemaVersion !== 1 ||
      !Number.isFinite(s.quality) || s.quality < 0 || s.quality > 100 ||
      !Number.isSafeInteger(s.nowMs) || s.nowMs < 0 || s.nowMs % AIR_CONFIG.tickMs !== 0 ||
      !Array.isArray(s.vents) || s.vents.length > AIR_CONFIG.maxUnits ||
      !s.vents.every(v => v && typeof v.id === 'string' && !!v.id &&
        typeof v.enabled === 'boolean' && typeof v.powered === 'boolean' &&
        Number.isFinite(v.health) && v.health >= 0 && v.health <= 100) ||
      new Set(s.vents.map(v => v.id)).size !== s.vents.length ||
      !Number.isFinite(s.coverage) || s.coverage < 0 || s.coverage > AIR_CONFIG.maxUnits * ventCapacity(3) ||
      !Number.isSafeInteger(s.population) || s.population < 0 || s.population > AIR_CONFIG.maxPopulation ||
      !Number.isSafeInteger(s.powerUsed) || s.powerUsed < 0 || s.powerUsed > AIR_CONFIG.maxUnits * ventPower(3) ||
      !Number.isFinite(s.emissions) || s.emissions < 0 || s.emissions > AIR_CONFIG.maxEmissions ||
      !(['stable','no-vents','disabled','damaged','power','overload','emissions'] as AirReason[]).includes(s.reason) ||
      !Array.isArray(s.operations) || s.operations.length > 5000 ||
      !s.operations.every(id => typeof id === 'string' && !!id) ||
      new Set(s.operations).size !== s.operations.length) return null;
    const a = new AirSystem();
    a.state = structuredClone(s);
    return a;
  }
}
