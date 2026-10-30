import { RESEARCH_CONFIG, type TechnologyModifiers } from '../research/research';
import type { Room } from '../building/placement';
import { getRoomPerformance } from '../building/upgrades';

export const RESOURCE_TYPES = ['power', 'food', 'ore', 'supplies'] as const;
export type ResourceType = typeof RESOURCE_TYPES[number];
export type ResourceStock = Record<ResourceType, number>;
export const RESOURCE_TICK_MS = 5_000;
export const INITIAL_RESOURCES: Readonly<ResourceStock> = {
  power: 12, food: 12, ore: 0, supplies: 0
};
const BASE_CAPACITY = 30;
const MAX_STOCK = 100_000;

export interface ResourceSnapshot {
  schemaVersion: 1;
  stock: ResourceStock;
  elapsedMs: number;
  tickCount: number;
  lastShortages: ResourceType[];
  inactiveRooms: number;
}

const isResourceType = (value: unknown): value is ResourceType =>
  typeof value === 'string' && RESOURCE_TYPES.includes(value as ResourceType);

export function getResourceCapacity(rooms: readonly Room[]): number {
  return BASE_CAPACITY + rooms
    .filter((room) => room.type === 'storage')
    .reduce((total, room) => total + getRoomPerformance(room.type, room.level).value, 0);
}

/** Deterministic local simulation. No real-time clock or wall-time catch-up. */
export class ResourceEngine {
  private stock: ResourceStock = { ...INITIAL_RESOURCES };
  private elapsedMs = 0;
  private ticks = 0;
  private shortages: ResourceType[] = [];
  private inactive = 0;

  get remainingMs(): number { return RESOURCE_TICK_MS - this.elapsedMs; }
  get tickCount(): number { return this.ticks; }

  static create(): ResourceEngine { return new ResourceEngine(); }

  static restore(raw: unknown): ResourceEngine | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Partial<ResourceSnapshot>;
    if (value.schemaVersion !== 1 || !value.stock ||
        typeof value.stock !== 'object' || Array.isArray(value.stock) ||
        !Number.isFinite(value.elapsedMs) || (value.elapsedMs ?? -1) < 0 ||
        (value.elapsedMs ?? RESOURCE_TICK_MS) >= RESOURCE_TICK_MS ||
        !Number.isSafeInteger(value.tickCount) || (value.tickCount ?? -1) < 0 ||
        !Number.isSafeInteger(value.inactiveRooms) || (value.inactiveRooms ?? -1) < 0 ||
        (value.inactiveRooms ?? Infinity) > 160 ||
        !Array.isArray(value.lastShortages) ||
        value.lastShortages.length > RESOURCE_TYPES.length ||
        !value.lastShortages.every(isResourceType) ||
        new Set(value.lastShortages).size !== value.lastShortages.length ||
        Object.keys(value.stock).length !== RESOURCE_TYPES.length ||
        !RESOURCE_TYPES.every((key) => Number.isSafeInteger(value.stock![key]) &&
          value.stock![key] >= 0 && value.stock![key] <= MAX_STOCK)) return null;
    const engine = new ResourceEngine();
    engine.stock = { ...value.stock } as ResourceStock;
    engine.elapsedMs = value.elapsedMs!;
    engine.ticks = value.tickCount!;
    engine.shortages = [...value.lastShortages];
    engine.inactive = value.inactiveRooms!;
    return engine;
  }

  snapshot(): ResourceSnapshot {
    return {
      schemaVersion: 1, stock: { ...this.stock },
      elapsedMs: this.elapsedMs, tickCount: this.ticks,
      lastShortages: [...this.shortages], inactiveRooms: this.inactive
    };
  }

  spendPower(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount < 0 || this.stock.power < amount) return false;
    this.stock.power -= amount; return true;
  }

  /** Removing storage reduces capacity without leaving impossible balances. */
  reconcileCapacity(rooms: readonly Room[]): void {
    const capacity = getResourceCapacity(rooms);
    for (const key of RESOURCE_TYPES) this.stock[key] = Math.min(this.stock[key], capacity);
  }

  /** Returns the number of complete simulation ticks. Call only while playing. */
  advance(deltaMs: number, rooms: readonly Room[], modifiers: TechnologyModifiers = {powerProduction:1,foodProduction:1}): number {
    if (![modifiers.powerProduction,modifiers.foodProduction].every(n=>Number.isFinite(n)&&n>=1&&n<=27))return 0;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
    // Large suspended-tab or device-sleep deltas must not cause offline farming.
    this.elapsedMs += Math.min(deltaMs, 60_000);
    let processed = 0;
    while (this.elapsedMs >= RESOURCE_TICK_MS) {
      this.elapsedMs -= RESOURCE_TICK_MS;
      this.runTick(rooms,modifiers);
      this.ticks++;
      processed++;
    }
    return processed;
  }

  private runTick(rooms: readonly Room[], modifiers: TechnologyModifiers): void {
    this.reconcileCapacity(rooms);
    const capacity = getResourceCapacity(rooms);
    const missing = new Set<ResourceType>();
    let inactive = 0;
    // All recipes are atomic: a room never consumes inputs without completing its work.
    const recipe = (inputs: Partial<ResourceStock>, output?: { type: ResourceType; amount: number }): void => {
      const unavailable = RESOURCE_TYPES.filter((key) => (inputs[key] ?? 0) > this.stock[key]);
      if (unavailable.length) {
        for (const key of unavailable) missing.add(key);
        inactive++;
        return;
      }
      if (output && this.stock[output.type] >= capacity) return;
      for (const key of RESOURCE_TYPES) this.stock[key] -= inputs[key] ?? 0;
      if (output) this.stock[output.type] = Math.min(capacity, this.stock[output.type] + output.amount);
    };
    // Priority is fixed rather than dependent on insertion/snapshot room order.
    const priority = ['generator', 'command', 'habitat', 'hydroponics',
      'mine', 'workshop', 'medbay', 'storage', 'waterTreatment', 'laboratory'] as const;
    const ordered = [...rooms].sort((a, b) =>
      priority.indexOf(a.type) - priority.indexOf(b.type) || a.id.localeCompare(b.id));
    for (const room of ordered) {
      const value = getRoomPerformance(room.type, room.level).value;
      switch (room.type) {
        case 'generator': recipe({}, { type: 'power', amount: Math.floor(value * modifiers.powerProduction) }); break;
        case 'command': recipe({ power: value }); break;
        case 'habitat': recipe({ power: Math.ceil(value / 2), food: value }); break;
        case 'hydroponics': recipe({ power: Math.ceil(value / 2) },
          { type: 'food', amount: Math.floor(value * modifiers.foodProduction) }); break;
        case 'mine': recipe({ power: Math.ceil(value / 2) },
          { type: 'ore', amount: value }); break;
        case 'workshop': recipe({ power: Math.ceil(value / 2), ore: Math.ceil(value / 2) },
          { type: 'supplies', amount: value }); break;
        case 'medbay': recipe({ power: value, supplies: 1 }); break;
        case 'laboratory': recipe({power:RESEARCH_CONFIG.labPower}); break;
        case 'storage': break;
      }
    }
    this.shortages = RESOURCE_TYPES.filter((type) => missing.has(type));
    this.inactive = inactive;
  }
}
