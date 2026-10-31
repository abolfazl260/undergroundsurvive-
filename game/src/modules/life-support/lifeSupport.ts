import type { Room } from '../building/placement';
import { getRoomPerformance } from '../building/upgrades';

/** Balancing units per existing five-second economy tick. */
export const LIFE_SUPPORT_CONFIG = {
  schemaVersion: 2, tickMs: 5_000, oxygenBaseCapacity: 30,
  oxygenStoragePerLevel: 25, oxygenPerVentLevel: 3,
  waterPerResident: 1, oxygenPerResident: 1,
  medbayWater: 1, medbayOxygen: 1, gardenWater: 1,
  flowPerLevel: 8,
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
export interface LifeSupportLink { readonly a: string; readonly b: string; readonly open: boolean; readonly capacity: number }
export interface LifeSupportZone { readonly ids: string[]; readonly hasWater: boolean; readonly hasOxygen: boolean; readonly waterStock?: number; readonly oxygenStock?: number }
export interface LifeSupportRoomStatus { readonly id: string; readonly status: LifeCondition; readonly missing: LifeResource[] }
export interface LifeSupportSnapshot {
  schemaVersion: 2;
  oxygen: number;
  /** Physical room-held lots, backed by the existing water inventory. */
  waterLots: Record<string, number>;
  oxygenLots: Record<string, number>;
  legacyWater: number;
  legacyOxygen: number;
  waterLedgerSeen: number;
  closedLinks: string[];
  ticks: number;
  graceTicks: number;
  lastProduced: number;
  lastWaterProduced: number;
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
  records?(): readonly {id:number;roomId?:string;clean:number}[];
}
export interface LifeSupportOccupancy { population(): number }
export interface LifeSupportPower { powered(roomId: string): boolean }
export interface LifeSupportVent { readonly id: string; readonly powered: boolean }
export interface LifeSupportView {
  readonly water: { readonly stock: number; readonly capacity: number; readonly produced: number; readonly consumed: number; readonly etaTicks: number | null };
  readonly oxygen: { readonly stock: number; readonly capacity: number; readonly produced: number; readonly consumed: number; readonly etaTicks: number | null };
  readonly zones: LifeSupportZone[];
  readonly links: LifeSupportLink[];
  readonly rooms: LifeSupportRoomStatus[];
  readonly graceTicks: number;
  readonly events: LifeSupportEvent[];
}
/** Resource quantities stay bounded; lifetime counters and ledger IDs must not. */
const validNumber = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 100_000;
const validLifetimeCount = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
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
      if (sideways) links.push({ a: a.id, b: b.id, open: !closed.has(linkKey(a.id, b.id)),
        capacity: LIFE_SUPPORT_CONFIG.flowPerLevel * Math.min(a.level, b.level) });
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
/** Deterministic BFS against residual per-tick flow. Does not reserve links until
 * both resource paths and inventories have passed validation. */
export function findLifeSupportRoute(
  graph: LifeSupportGraph, sources: readonly string[], destination: string, amount: number,
  residual: ReadonlyMap<string, number>
): string[] | null {
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  if (amount === 0) return [];
  const sourceSet = new Set(sources);
  if (sourceSet.has(destination)) return [];
  const pending = [destination], paths = new Map<string, string[]>([[destination, []]]);
  while (pending.length) {
    const at = pending.shift()!;
    const edges = graph.links.filter(e => e.open && (e.a === at || e.b === at))
      .sort((a, b) => linkKey(a.a, a.b).localeCompare(linkKey(b.a, b.b)));
    for (const edge of edges) {
      const key = linkKey(edge.a, edge.b);
      if ((residual.get(key) ?? edge.capacity) < amount) continue;
      const next = edge.a === at ? edge.b : edge.a;
      if (paths.has(next)) continue;
      const route = [...paths.get(at)!, key];
      if (sourceSet.has(next)) return route;
      paths.set(next, route); pending.push(next);
    }
  }
  return null;
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

/** Owns the physical oxygen lots and water-allocation ledger. Actual clean-water
 * debits remain in the pre-existing WaterProductionProcessor, never duplicated.
 * No timer: one call from the five-second economy adapter after ventilation. */
export class LifeSupportService {
  private state: LifeSupportSnapshot = {
    schemaVersion: 2, oxygen: LIFE_SUPPORT_CONFIG.initialOxygen,
    oxygenLots: {}, waterLots: {}, legacyOxygen: LIFE_SUPPORT_CONFIG.initialOxygen,
    legacyWater: 0, waterLedgerSeen: 0, closedLinks: [],
    ticks: 0, graceTicks: LIFE_SUPPORT_CONFIG.legacyGraceTicks,
    lastProduced: 0, lastWaterProduced: 0, lastWaterUsed: 0, lastOxygenUsed: 0, events: [], roomStatuses: []
  };
  snapshot(): LifeSupportSnapshot { return structuredClone(this.state); }
  static restore(raw: unknown): LifeSupportService | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Partial<LifeSupportSnapshot>;
    const lotsValid = (lots: unknown): lots is Record<string,number> => {
      if (!lots || typeof lots !== 'object' || Array.isArray(lots)) return false;
      const pairs = Object.entries(lots);
      return pairs.length <= LIFE_SUPPORT_CONFIG.maxRooms &&
        pairs.every(([k,v]) => k.length > 0 && k.length < 200 && k !== '__legacy__' && validNumber(v));
    };
    if (s.schemaVersion !== 2 || !validNumber(s.oxygen) || !validLifetimeCount(s.ticks) ||
      !validNumber(s.graceTicks) || (s.graceTicks ?? Infinity) > LIFE_SUPPORT_CONFIG.legacyGraceTicks ||
      !lotsValid(s.waterLots) || !lotsValid(s.oxygenLots) ||
      !validNumber(s.legacyWater) || !validNumber(s.legacyOxygen) || !validLifetimeCount(s.waterLedgerSeen) ||
      (s.legacyOxygen! + Object.values(s.oxygenLots!).reduce((a,b)=>a+b,0)) !== s.oxygen ||
      !validNumber(s.lastProduced) || !validNumber(s.lastWaterProduced) || !validNumber(s.lastWaterUsed) || !validNumber(s.lastOxygenUsed) ||
      !Array.isArray(s.closedLinks) || s.closedLinks.length > 500 ||
      !s.closedLinks.every(k => typeof k === 'string' && k.length > 0 && k.length < 400) ||
      new Set(s.closedLinks).size !== s.closedLinks.length ||
      !Array.isArray(s.events) || s.events.length > 100 ||
      !s.events.every(e => e && ['life-support-shortage', 'survivor-exposure'].includes(e.type) &&
        ['water', 'oxygen'].includes(e.resource) && typeof e.roomId === 'string' && validLifetimeCount(e.tick) && e.tick <= s.ticks!) ||
      !Array.isArray(s.roomStatuses) || s.roomStatuses.length > LIFE_SUPPORT_CONFIG.maxRooms ||
      !s.roomStatuses.every(r => r && typeof r.id === 'string' && ['online','degraded','offline'].includes(r.status) &&
        Array.isArray(r.missing) && r.missing.every(m => m === 'water' || m === 'oxygen'))) return null;
    const service = new LifeSupportService();
    service.state = structuredClone(s as LifeSupportSnapshot);
    return service;
  }
  /** On demolition, detach the inventory from the removed node. Emergency stocks
   * are preserved without allowing them to magically feed disconnected rooms. */
  sync(rooms: readonly Room[]): void {
    const graph = new LifeSupportGraph(rooms, this.state.closedLinks);
    const valid = new Set(graph.links.map(l => linkKey(l.a, l.b)));
    this.state.closedLinks = this.state.closedLinks.filter(k => valid.has(k));
    const roomIds = new Set(rooms.map(r => r.id));
    for (const [id, value] of Object.entries(this.state.waterLots)) if (!roomIds.has(id)) {
      this.state.legacyWater += value; delete this.state.waterLots[id];
    }
    for (const [id, value] of Object.entries(this.state.oxygenLots)) if (!roomIds.has(id)) {
      this.state.legacyOxygen += value; delete this.state.oxygenLots[id];
    }
    // Drop over-capacity oxygen in a stable order, without negative balances.
    let overflow = Math.max(0, this.state.oxygen - oxygenCapacity(rooms));
    const drop = Math.min(overflow, this.state.legacyOxygen);
    this.state.legacyOxygen -= drop; overflow -= drop;
    for (const id of Object.keys(this.state.oxygenLots).sort().reverse()) {
      if (!overflow) break;
      const n = Math.min(this.state.oxygenLots[id], overflow);
      this.state.oxygenLots[id] -= n; overflow -= n;
    }
    this.state.oxygen = this.state.legacyOxygen +
      Object.values(this.state.oxygenLots).reduce((n,v) => n + v, 0);
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
  /** The water processor is authoritative. Allocations only describe *where* the
   * existing clean-water units live, never an additional inventory balance.
   * Kitchen/other consumption is reconciled at each simulation tick. */
  private reconcileWater(rooms: readonly Room[], water: LifeSupportWater): void {
    const excess=Math.max(0,water.available()-water.capacity());
    if(excess)water.spend(excess); // a demolished tank may lower capacity
    const actual=water.available();
    const records=(water.records?.()??[]).filter(r=>validLifetimeCount(r.id)&&validNumber(r.clean))
      .sort((a,b)=>a.id-b.id);
    const maxId=records.at(-1)?.id??this.state.waterLedgerSeen;
    this.state.lastWaterProduced=0;
    const producers=[...rooms].filter(r=>r.type==='waterTreatment').sort((a,b)=>a.id.localeCompare(b.id));
    const storage=[...rooms].filter(r=>r.type==='storage').sort((a,b)=>a.id.localeCompare(b.id));
    const defaultSource=producers[0]??storage[0];
    const allocation=(id:string|undefined,amount:number)=>{
      if(!amount)return;
      if(id && rooms.some(r=>r.id===id&&(r.type==='waterTreatment'||r.type==='storage')))
        this.state.waterLots[id]=(this.state.waterLots[id]??0)+amount;
      else if(defaultSource)
        this.state.waterLots[defaultSource.id]=(this.state.waterLots[defaultSource.id]??0)+amount;
      else this.state.legacyWater+=amount;
    };
    // Previous saves had no allocation metadata, and historical ledger entries must
    // not be credited twice when importing such a save.
    if(this.state.ticks===0 && this.state.waterLedgerSeen===0 &&
       this.state.legacyWater===0 && Object.keys(this.state.waterLots).length===0) {
      allocation(defaultSource?.id,actual);
      this.state.waterLedgerSeen=maxId;
    } else {
      for(const record of records)if(record.id>this.state.waterLedgerSeen) {
        allocation(record.roomId,record.clean);
        this.state.lastWaterProduced+=record.clean;
      }
      this.state.waterLedgerSeen=Math.max(this.state.waterLedgerSeen,maxId);
      let recorded=this.state.legacyWater+Object.values(this.state.waterLots).reduce((n,v)=>n+v,0);
      if(recorded>actual) {
        let deficit=recorded-actual;
        const old=Math.min(deficit,this.state.legacyWater);
        this.state.legacyWater-=old;deficit-=old;
        for(const id of Object.keys(this.state.waterLots).sort().reverse()) {
          if(!deficit)break;
          const n=Math.min(deficit,this.state.waterLots[id]);
          this.state.waterLots[id]-=n;deficit-=n;
        }
      } else if(actual>recorded)allocation(defaultSource?.id,actual-recorded);
    }
    // Rescue virtual legacy water into one physical tank if one becomes available.
    if(defaultSource&&this.state.legacyWater) {
      this.state.waterLots[defaultSource.id]=(this.state.waterLots[defaultSource.id]??0)+this.state.legacyWater;
      this.state.legacyWater=0;
    }
    const allocated=this.state.legacyWater+Object.values(this.state.waterLots).reduce((n,v)=>n+v,0);
    if(allocated!==actual)throw new Error('Water allocation invariant violated');
  }
  /** No physical room can spend from a virtual emergency pool.
   * Transfer the old virtual oxygen reserve to the earliest real tank or vent. */
  private reconcileOxygen(rooms: readonly Room[]): void {
    const home = [...rooms].filter(r=>r.type==='storage'||r.type==='ventilation')
      .sort((a,b)=>a.id.localeCompare(b.id))[0];
    if (home && this.state.legacyOxygen) {
      this.state.oxygenLots[home.id]=(this.state.oxygenLots[home.id]??0)+this.state.legacyOxygen;
      this.state.legacyOxygen=0;
    }
  }
  /** Prepare a deterministic, rollback-safe plan. Routes have separate per-resource
   * capacity accounting; room-held lots cannot be drawn from other islands. */
  private allocation(graph: LifeSupportGraph, lots: Readonly<Record<string,number>>,
                     target: string, units: number, residual: ReadonlyMap<string,number>):
    {parts: {id:string;units:number}[]; flow: Map<string,number>} | null {
    if (units === 0) return {parts:[],flow:new Map(residual)};
    const flow = new Map(residual), parts: {id:string;units:number}[] = [];
    let missing=units;
    for (const id of Object.keys(lots).sort()) {
      let available=lots[id];
      while (available>0 && missing>0) {
        const route=findLifeSupportRoute(graph,[id],target,1,flow);
        if (route===null) break;
        const channel = route.reduce((n,k)=>Math.min(n,flow.get(k)??0),Number.MAX_SAFE_INTEGER);
        const taken=Math.min(available,missing,channel);
        if (!taken) break;
        parts.push({id,units:taken}); available-=taken; missing-=taken;
        for (const k of route) flow.set(k,flow.get(k)!-taken);
      }
      if (missing===0) break;
    }
    return missing===0 ? {parts,flow}:null;
  }
  /** Atomic water + oxygen allocation, no health/character mutation. */
  tick(rooms: readonly Room[], water: LifeSupportWater, occupancy: LifeSupportOccupancy,
       power: LifeSupportPower, vents: readonly LifeSupportVent[]): void {
    this.sync(rooms);
    this.reconcileWater(rooms,water);
    this.reconcileOxygen(rooms);
    const graph = new LifeSupportGraph(rooms, this.state.closedLinks);
    const active = new Set(vents.filter(v => v.powered).map(v => v.id));
    this.state.lastProduced = 0;
    for (const room of [...rooms].sort((a,b)=>a.id.localeCompare(b.id))) {
      if (room.type !== 'ventilation' || !active.has(room.id) || !power.powered(room.id)) continue;
      const produced = Math.min(room.level * LIFE_SUPPORT_CONFIG.oxygenPerVentLevel,
        Math.max(0,oxygenCapacity(rooms)-this.state.oxygen));
      this.state.oxygenLots[room.id]=(this.state.oxygenLots[room.id]??0)+produced;
      this.state.oxygen += produced; this.state.lastProduced += produced;
    }
    this.state.lastWaterUsed = 0;
    this.state.lastOxygenUsed = 0;
    this.state.events = [];
    if (!Number.isSafeInteger(this.state.ticks + 1)) throw new Error('Life-support tick counter overflow');
    this.state.ticks++;
    if (this.state.graceTicks > 0) {
      this.state.graceTicks--;
      this.state.roomStatuses = rooms.map(r => ({id:r.id,status:'online' as const,missing:[]}));
      return;
    }
    const demands = lifeSupportDemands(rooms, occupancy.population());
    const missingByRoom = new Map<string, LifeResource[]>();
    let waterFlow = new Map(graph.links.map(l => [linkKey(l.a,l.b), l.capacity] as const));
    let oxygenFlow = new Map(graph.links.map(l => [linkKey(l.a,l.b), l.capacity] as const));
    for (const demand of demands) {
      const bad: LifeResource[] = [];
      const w = this.allocation(graph,this.state.waterLots,demand.id,demand.water,waterFlow);
      const o = this.allocation(graph,this.state.oxygenLots,demand.id,demand.oxygen,oxygenFlow);
      if (demand.water && (!w || water.available() < demand.water)) bad.push('water');
      if (demand.oxygen && (!o || this.state.oxygen < demand.oxygen)) bad.push('oxygen');
      if (!bad.length) {
        if (demand.water && !water.spend(demand.water)) bad.push('water');
        if (!bad.length) {
          for(const part of w!.parts) this.state.waterLots[part.id]-=part.units;
          for(const part of o!.parts) this.state.oxygenLots[part.id]-=part.units;
          waterFlow=w!.flow;oxygenFlow=o!.flow;
          this.state.oxygen-=demand.oxygen;
          this.state.lastWaterUsed+=demand.water;
          this.state.lastOxygenUsed+=demand.oxygen;
        }
      }
      if (bad.length) {
        missingByRoom.set(demand.id,bad);
        for(const resource of bad) {
          this.state.events.push({type:'life-support-shortage',resource,roomId:demand.id,tick:this.state.ticks});
          if(demand.priority==='vital')
            this.state.events.push({type:'survivor-exposure',resource,roomId:demand.id,tick:this.state.ticks});
        }
      }
    }
    this.state.events=this.state.events.slice(0,100);
    this.state.roomStatuses=rooms.map(r=>{
      const missing=missingByRoom.get(r.id)??[];
      return {id:r.id,status:missing.length===2?'offline' as const :
        missing.length===1?'degraded' as const:'online' as const,missing};
    }).sort((a,b)=>a.id.localeCompare(b.id));
  }
  view(rooms: readonly Room[], water: LifeSupportWater): LifeSupportView {
    const graph=new LifeSupportGraph(rooms,this.state.closedLinks);
    return {
      water:{stock:water.available(),capacity:water.capacity(),produced:this.state.lastWaterProduced,consumed:this.state.lastWaterUsed,
        etaTicks:eta(water.available(),this.state.lastWaterUsed,this.state.lastWaterProduced)},
      oxygen:{stock:this.state.oxygen,capacity:oxygenCapacity(rooms),produced:this.state.lastProduced,
        consumed:this.state.lastOxygenUsed,etaTicks:eta(this.state.oxygen,this.state.lastOxygenUsed,this.state.lastProduced)},
      zones:graph.zones.map(z=>({...z,
        waterStock:z.ids.reduce((n,id)=>n+(this.state.waterLots[id]??0),0),
        oxygenStock:z.ids.reduce((n,id)=>n+(this.state.oxygenLots[id]??0),0)})),
      links:graph.links,rooms:structuredClone(this.state.roomStatuses),
      graceTicks:this.state.graceTicks,events:structuredClone(this.state.events)
    };
  }
}
