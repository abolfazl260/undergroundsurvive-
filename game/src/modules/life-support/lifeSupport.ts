import type { Room } from '../building/placement';
import { getRoomPerformance } from '../building/upgrades';

/** Balancing units per existing five-second economy tick. */
export const LIFE_SUPPORT_CONFIG = {
  schemaVersion: 1, tickMs: 5_000, oxygenBaseCapacity: 30,
  oxygenStoragePerLevel: 25, oxygenPerVentLevel: 3,
  waterPerResident: 1, oxygenPerResident: 1,
  medbayWater: 1, medbayOxygen: 1, gardenWater: 1,
  legacyGraceTicks: 36, initialOxygen: 18, maxRooms: 160
} as const;
export type LifeResource = 'water' | 'oxygen';
export type LifeCondition = 'online' | 'degraded' | 'offline';
export type LifePriority = 'vital' | 'medical' | 'secondary';
export interface LifeSupportEvent {
  readonly type: 'life-support-shortage' | 'survivor-exposure';
  readonly resource: LifeResource;
  readonly roomId: string;
  readonly tick: number;
}
export interface LifeSupportLink { readonly a: string; readonly b: string; readonly open: boolean }
export interface LifeSupportZone { readonly ids: string[]; readonly hasWater: boolean; readonly hasOxygen: boolean }
export interface LifeSupportRoomStatus { readonly id: string; readonly status: LifeCondition; readonly missing: LifeResource[] }
export interface LifeSupportSnapshot {
  schemaVersion: 1;
  oxygen: number;
  closedLinks: string[];
  ticks: number;
  graceTicks: number;
  lastProduced: number;
  lastWaterUsed: number;
  lastOxygenUsed: number;
  events: LifeSupportEvent[];
  roomStatuses: LifeSupportRoomStatus[];
}
export interface LifeSupportWater {
  /** The existing WaterProductionProcessor is the ONLY clean-water inventory. */
  available(): number;
  capacity(): number;
  spend(amount: number): boolean;
}
export interface LifeSupportOccupancy { population(): number }
export interface LifeSupportPower { powered(roomId: string): boolean }
export interface LifeSupportVent { readonly id: string; readonly powered: boolean }
export interface LifeSupportView {
  readonly water: { readonly stock: number; readonly capacity: number; readonly consumed: number; readonly etaTicks: number | null };
  readonly oxygen: { readonly stock: number; readonly capacity: number; readonly produced: number; readonly consumed: number; readonly etaTicks: number | null };
  readonly zones: LifeSupportZone[];
  readonly links: LifeSupportLink[];
  readonly rooms: LifeSupportRoomStatus[];
  readonly graceTicks: number;
  readonly events: LifeSupportEvent[];
}
const validNumber = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 100_000;
export const linkKey = (a: string, b: string): string => [a, b].sort().join('::');

/** Only rooms with a physical side-to-side built-in pipe/duct port share an edge.
 * Each fitting has a separately configurable isolation valve (closedLinks).
 * This is independent of the electrical network and never traverses solid rock. */
export class LifeSupportGraph {
  readonly links: LifeSupportLink[];
  readonly zones: LifeSupportZone[];
  constructor(rooms: readonly Room[], closedLinks: readonly string[] = []) {
    const sorted = [...rooms].sort((a, b) => a.id.localeCompare(b.id));
    const closed = new Set(closedLinks);
    const links: LifeSupportLink[] = [];
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      const sideways = a.y < b.y + b.height && b.y < a.y + a.height &&
        (a.x + a.width === b.x || b.x + b.width === a.x);
      if (sideways) links.push({ a: a.id, b: b.id, open: !closed.has(linkKey(a.id, b.id)) });
    }
    this.links = links;
    const neighbours = new Map(sorted.map(room => [room.id, [] as string[]]));
    for (const link of links) if (link.open) {
      neighbours.get(link.a)!.push(link.b);
      neighbours.get(link.b)!.push(link.a);
    }
    const visited = new Set<string>();
    this.zones = [];
    for (const room of sorted) {
      if (visited.has(room.id)) continue;
      const ids: string[] = [], pending = [room.id];
      visited.add(room.id);
      while (pending.length) {
        const id = pending.shift()!;
        ids.push(id);
        for (const neighbour of neighbours.get(id)!.sort()) if (!visited.has(neighbour)) {
          visited.add(neighbour); pending.push(neighbour);
        }
      }
      ids.sort();
      const members = sorted.filter(r => ids.includes(r.id));
      this.zones.push({
        ids, hasWater: members.some(r => r.type === 'waterTreatment' || r.type === 'storage'),
        hasOxygen: members.some(r => r.type === 'ventilation' || r.type === 'storage')
      });
    }
  }
}
interface Demand { id: string; priority: LifePriority; water: number; oxygen: number }
const priority: Record<LifePriority, number> = { vital: 0, medical: 1, secondary: 2 };
export function lifeSupportDemands(rooms: readonly Room[], population: number): Demand[] {
  if (!Number.isSafeInteger(population) || population < 0 || population > 100) throw new Error('Invalid population');
  const result: Demand[] = [];
  const habitat = [...rooms].filter(r => r.type === 'habitat').sort((a, b) => a.id.localeCompare(b.id));
  let remaining = population;
  for (const room of habitat) {
    const people = Math.min(remaining, getRoomPerformance('habitat', room.level).value);
    remaining -= people;
    if (people) result.push({ id: room.id, priority: 'vital',
      water: people * LIFE_SUPPORT_CONFIG.waterPerResident,
      oxygen: people * LIFE_SUPPORT_CONFIG.oxygenPerResident });
  }
  if (remaining) {
    const fallback = [...rooms].sort((a, b) => a.id.localeCompare(b.id))[0];
    if (fallback) {
      const existing = result.find(d => d.id === fallback.id && d.priority === 'vital');
      if (existing) {
        existing.water += remaining * LIFE_SUPPORT_CONFIG.waterPerResident;
        existing.oxygen += remaining * LIFE_SUPPORT_CONFIG.oxygenPerResident;
      } else result.push({ id: fallback.id, priority: 'vital',
        water: remaining * LIFE_SUPPORT_CONFIG.waterPerResident,
        oxygen: remaining * LIFE_SUPPORT_CONFIG.oxygenPerResident });
    }
  }
  for (const room of rooms) {
    if (room.type === 'medbay') result.push({ id: room.id, priority: 'medical',
      water: LIFE_SUPPORT_CONFIG.medbayWater * room.level, oxygen: LIFE_SUPPORT_CONFIG.medbayOxygen * room.level });
    if (room.type === 'hydroponics') result.push({ id: room.id, priority: 'secondary',
      water: LIFE_SUPPORT_CONFIG.gardenWater * room.level, oxygen: 0 });
  }
  return result.sort((a, b) => priority[a.priority] - priority[b.priority] || a.id.localeCompare(b.id));
}
export function oxygenCapacity(rooms: readonly Room[]): number {
  return LIFE_SUPPORT_CONFIG.oxygenBaseCapacity + rooms.filter(r => r.type === 'storage')
    .reduce((n, r) => n + LIFE_SUPPORT_CONFIG.oxygenStoragePerLevel * r.level, 0);
}
const eta = (stock: number, used: number, produced: number) =>
  used > produced ? Math.floor(stock / (used - produced)) : null;

/** Owns only oxygen; clean water remains in the pre-existing water processor.
 * No timer: exactly one call from the 5s economy adapter, after ventilation. */
export class LifeSupportService {
  private state: LifeSupportSnapshot = {
    schemaVersion: 1, oxygen: LIFE_SUPPORT_CONFIG.initialOxygen, closedLinks: [],
    ticks: 0, graceTicks: LIFE_SUPPORT_CONFIG.legacyGraceTicks,
    lastProduced: 0, lastWaterUsed: 0, lastOxygenUsed: 0, events: [], roomStatuses: []
  };
  snapshot(): LifeSupportSnapshot { return structuredClone(this.state); }
  static restore(raw: unknown): LifeSupportService | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Partial<LifeSupportSnapshot>;
    if (s.schemaVersion !== 1 || !validNumber(s.oxygen) || !validNumber(s.ticks) ||
      !validNumber(s.graceTicks) || (s.graceTicks ?? Infinity) > LIFE_SUPPORT_CONFIG.legacyGraceTicks ||
      !validNumber(s.lastProduced) || !validNumber(s.lastWaterUsed) || !validNumber(s.lastOxygenUsed) ||
      !Array.isArray(s.closedLinks) || s.closedLinks.length > 500 ||
      !s.closedLinks.every(k => typeof k === 'string' && k.length > 0 && k.length < 400) ||
      new Set(s.closedLinks).size !== s.closedLinks.length ||
      !Array.isArray(s.events) || s.events.length > 100 ||
      !s.events.every(e => e && ['life-support-shortage', 'survivor-exposure'].includes(e.type) &&
        ['water', 'oxygen'].includes(e.resource) && typeof e.roomId === 'string' && validNumber(e.tick)) ||
      !Array.isArray(s.roomStatuses) || s.roomStatuses.length > LIFE_SUPPORT_CONFIG.maxRooms ||
      !s.roomStatuses.every(r => r && typeof r.id === 'string' && ['online','degraded','offline'].includes(r.status) &&
        Array.isArray(r.missing) && r.missing.every(m => m === 'water' || m === 'oxygen'))) return null;
    const service = new LifeSupportService();
    service.state = structuredClone(s as LifeSupportSnapshot);
    return service;
  }
  sync(rooms: readonly Room[]): void {
    const graph = new LifeSupportGraph(rooms, this.state.closedLinks);
    const valid = new Set(graph.links.map(l => linkKey(l.a, l.b)));
    this.state.closedLinks = this.state.closedLinks.filter(k => valid.has(k));
    this.state.oxygen = Math.min(this.state.oxygen, oxygenCapacity(rooms));
    const roomIds = new Set(rooms.map(r => r.id));
    this.state.roomStatuses = this.state.roomStatuses.filter(r => roomIds.has(r.id));
  }
  toggleLink(a: string, b: string, rooms: readonly Room[]): boolean {
    if (a === b) return false;
    const key = linkKey(a, b);
    if (!new LifeSupportGraph(rooms).links.some(l => linkKey(l.a, l.b) === key)) return false;
    const closed = new Set(this.state.closedLinks);
    if (closed.has(key)) closed.delete(key); else closed.add(key);
    this.state.closedLinks = [...closed].sort();
    return true;
  }
  /** Atomic per-consumer water + oxygen debit; never spends one if the other is missing. */
  tick(rooms: readonly Room[], water: LifeSupportWater, occupancy: LifeSupportOccupancy,
       power: LifeSupportPower, vents: readonly LifeSupportVent[]): void {
    this.sync(rooms);
    const graph = new LifeSupportGraph(rooms, this.state.closedLinks);
    const active = new Set(vents.filter(v => v.powered).map(v => v.id));
    const production = rooms.filter(r => r.type === 'ventilation' && active.has(r.id) && power.powered(r.id))
      .reduce((n, r) => n + r.level * LIFE_SUPPORT_CONFIG.oxygenPerVentLevel, 0);
    const before = this.state.oxygen;
    this.state.oxygen = Math.min(oxygenCapacity(rooms), before + production);
    this.state.lastProduced = this.state.oxygen - before;
    this.state.lastWaterUsed = 0;
    this.state.lastOxygenUsed = 0;
    this.state.events = [];
    this.state.ticks++;
    if (this.state.graceTicks > 0) {
      this.state.graceTicks--;
      this.state.roomStatuses = rooms.map(r => ({id:r.id,status:'online' as const,missing:[]}));
      return;
    }
    const demands = lifeSupportDemands(rooms, occupancy.population());
    const missingByRoom = new Map<string, LifeResource[]>();
    const zoneFor = new Map(graph.zones.flatMap(z => z.ids.map(id => [id, z] as const)));
    for (const demand of demands) {
      const zone = zoneFor.get(demand.id);
      if (!zone) continue;
      const bad: LifeResource[] = [];
      if (demand.water && (!zone.hasWater || water.available() < demand.water)) bad.push('water');
      if (demand.oxygen && (!zone.hasOxygen || this.state.oxygen < demand.oxygen)) bad.push('oxygen');
      if (bad.length === 0) {
        // Water adapter is checked before both debits. It must be synchronous and non-racy.
        if (demand.water && !water.spend(demand.water)) bad.push('water');
        if (!bad.length) {
          this.state.oxygen -= demand.oxygen;
          this.state.lastWaterUsed += demand.water;
          this.state.lastOxygenUsed += demand.oxygen;
        }
      }
      if (bad.length) {
        missingByRoom.set(demand.id, bad);
        for (const resource of bad) {
          this.state.events.push({type:'life-support-shortage',resource,roomId:demand.id,tick:this.state.ticks});
          if (demand.priority === 'vital')
            this.state.events.push({type:'survivor-exposure',resource,roomId:demand.id,tick:this.state.ticks});
        }
      }
    }
    this.state.events = this.state.events.slice(0, 100);
    this.state.roomStatuses = rooms.map(r => {
      const missing = missingByRoom.get(r.id) ?? [];
      return {id: r.id, status: missing.length === 2 ? 'offline' as const :
        missing.length === 1 ? 'degraded' as const : 'online' as const, missing};
    }).sort((a,b)=>a.id.localeCompare(b.id));
  }
  view(rooms: readonly Room[], water: LifeSupportWater): LifeSupportView {
    const graph = new LifeSupportGraph(rooms, this.state.closedLinks);
    return {
      water: {stock: water.available(),capacity:water.capacity(),consumed:this.state.lastWaterUsed,
        etaTicks: eta(water.available(),this.state.lastWaterUsed,0)},
      oxygen: {stock:this.state.oxygen,capacity:oxygenCapacity(rooms),produced:this.state.lastProduced,
        consumed:this.state.lastOxygenUsed,etaTicks:eta(this.state.oxygen,this.state.lastOxygenUsed,this.state.lastProduced)},
      zones: graph.zones, links: graph.links, rooms: structuredClone(this.state.roomStatuses),
      graceTicks:this.state.graceTicks,events:structuredClone(this.state.events)
    };
  }
}
