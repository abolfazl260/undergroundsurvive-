import type { Room } from '../building/placement';

/** Finite aquifer adapter: collecting transfers existing water, never creates it. */
export const WATER_CONFIG = { schemaVersion: 1, sourceId: 'shelter-aquifer', sourceReserve: 200,
  initialRaw: 20, capacity: 30, storageCapacity: 50, collectAmount: 10, collectPower: 1,
  recipe: { version: 1, raw: 2, power: 2, cleanPerLevel: 2, durationMs: 10_000 } } as const;
export type WaterBlock = 'paused' | 'raw' | 'power' | 'capacity' | 'producing';
export interface WaterCycle { id: string; level: number; elapsedMs: number; enabled: boolean }
export interface WaterSnapshot {
  schemaVersion: 1; raw: number; clean: number; reserve: number; cycles: WaterCycle[];
  completed: number; ledger: { id: number; raw: number; clean: number; power: number }[];
  operations: string[];
}
export interface WaterPower { available(): number; spend(amount: number): boolean }
export class WaterProductionProcessor {
  private state: WaterSnapshot = { schemaVersion: 1, raw: WATER_CONFIG.initialRaw, clean: 0,
    reserve: WATER_CONFIG.sourceReserve, cycles: [], completed: 0, ledger: [], operations: [] };
  capacity(rooms: readonly Room[]): number {
    return WATER_CONFIG.capacity + rooms.filter(r => r.type === 'storage')
      .reduce((n,r) => n + WATER_CONFIG.storageCapacity * r.level, 0);
  }
  recipe(level: number) { return { ...WATER_CONFIG.recipe, clean: WATER_CONFIG.recipe.cleanPerLevel * level }; }
  sync(rooms: readonly Room[]): void {
    this.state.cycles = rooms.filter(r => r.type === 'waterTreatment').map(r => {
      const old = this.state.cycles.find(c => c.id === r.id);
      // Upgrades cancel uncharged progress; moving preserves it, demolition discards it.
      return old?.level === r.level ? old : { id: r.id, level: r.level, elapsedMs: 0, enabled: old?.enabled ?? true };
    }).sort((a,b) => a.id.localeCompare(b.id));
  }
  status(cycle: WaterCycle, rooms: readonly Room[], power: number): WaterBlock {
    const recipe = this.recipe(cycle.level);
    if (!cycle.enabled) return 'paused';
    if (this.state.raw < recipe.raw) return 'raw';
    if (power < recipe.power) return 'power';
    if (this.state.clean + recipe.clean > this.capacity(rooms)) return 'capacity';
    return 'producing';
  }
  toggle(id: string): boolean {
    const c = this.state.cycles.find(c => c.id === id);
    if (!c) return false;
    c.enabled = !c.enabled; return true;
  }
  /** Used by other rooms after all costs have been checked. */
  spendClean(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount < 0 || this.state.clean < amount) return false;
    this.state.clean -= amount; return true;
  }
  collect(operationId: string, rooms: readonly Room[], power: WaterPower): boolean {
    if (!operationId || this.state.operations.includes(operationId) || this.state.operations.length >= 5000) return false;
    const amount = WATER_CONFIG.collectAmount;
    if (this.state.reserve < amount || this.state.raw + amount > this.capacity(rooms) ||
        !power.spend(WATER_CONFIG.collectPower)) return false;
    this.state.raw += amount; this.state.reserve -= amount; this.state.operations.push(operationId); return true;
  }
  advance(deltaMs: number, rooms: readonly Room[], power: WaterPower, poweredRooms?: ReadonlySet<string>): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.sync(rooms);
    for (const cycle of this.state.cycles) {
      if (poweredRooms && !poweredRooms.has(cycle.id)) continue;
      if (this.status(cycle, rooms, power.available()) !== 'producing') continue;
      const recipe = this.recipe(cycle.level);
      cycle.elapsedMs += deltaMs;
      while (cycle.elapsedMs >= recipe.durationMs) {
        if (this.status(cycle, rooms, power.available()) !== 'producing') { cycle.elapsedMs = recipe.durationMs; break; }
        if (!power.spend(recipe.power)) break;
        this.state.raw -= recipe.raw; this.state.clean += recipe.clean;
        cycle.elapsedMs -= recipe.durationMs;
        this.state.ledger.push({ id: ++this.state.completed, raw: -recipe.raw, clean: recipe.clean, power: -recipe.power });
        this.state.ledger = this.state.ledger.slice(-100);
      }
    }
  }
  snapshot(): WaterSnapshot { return structuredClone(this.state); }
  static restore(raw: unknown): WaterProductionProcessor | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as WaterSnapshot;
    if (s.schemaVersion !== 1 || ![s.raw,s.clean,s.reserve,s.completed].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100_000) ||
      s.reserve > WATER_CONFIG.sourceReserve || !Array.isArray(s.cycles) || s.cycles.length > 160 ||
      !Array.isArray(s.ledger) || s.ledger.length > 100 || !Array.isArray(s.operations) || s.operations.length > 5000 ||
      !s.operations.every(id => typeof id === 'string' && id.length > 0) || new Set(s.operations).size !== s.operations.length ||
      !s.cycles.every(c => c && typeof c === 'object') || !s.ledger.every(e => e && typeof e === 'object') ||
      new Set(s.cycles.map(c=>c.id)).size !== s.cycles.length ||
      !s.cycles.every(c => typeof c.id === 'string' && [1,2,3].includes(c.level) && typeof c.enabled === 'boolean' && Number.isFinite(c.elapsedMs) && c.elapsedMs >= 0 && c.elapsedMs <= WATER_CONFIG.recipe.durationMs) ||
      !s.ledger.every((e,i) => Number.isSafeInteger(e.id) && e.id > 0 && e.id <= s.completed && (!i || e.id > s.ledger[i-1].id) && e.raw === -2 && e.power === -2 && [2,4,6].includes(e.clean))) return null;
    const p = new WaterProductionProcessor(); p.state = structuredClone(s); return p;
  }
}
