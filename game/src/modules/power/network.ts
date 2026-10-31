import type { Room } from '../building/placement';
import { getRoomPowerFlow } from '../economy/resources';
import { WATER_CONFIG } from '../water/water';
import { ventPower } from '../air/air';
import { KITCHEN_CONFIG } from '../kitchen/kitchen';
import { GUARD_CONFIG } from '../survivors/roster';
import { RECREATION_CONFIG } from '../recreation/recreation';
import type { TechnologyModifiers } from '../research/research';
import { isInsideWorld } from '../world/grid';
import type { TerrainMap } from '../world/terrain';

/** Saved wires are the sole source of topology; connections are never inferred from adjacent rooms. */
export interface PowerCable { readonly x: number; readonly y: number; readonly riser: boolean }
export type PowerPriority = 0 | 1 | 2;
export interface PowerOverride { readonly roomId: string; readonly priority: PowerPriority }
export interface PowerSnapshot {
  readonly schemaVersion: 1;
  readonly mode: 'physical' | 'legacy';
  readonly cables: PowerCable[];
  readonly overrides: PowerOverride[];
}
export interface PowerRoomStatus {
  readonly roomId: string;
  readonly networkId: string | null;
  readonly demand: number;
  readonly production: number;
  readonly priority: PowerPriority;
  readonly status: 'online' | 'disconnected' | 'shed' | 'legacy';
}
export interface PowerNetwork {
  readonly id: string;
  readonly supply: number;
  readonly demand: number;
  readonly allocated: number;
  readonly shortage: number;
  readonly roomIds: string[];
}
export interface PowerAllocation {
  readonly mode: PowerSnapshot['mode'];
  readonly networks: PowerNetwork[];
  readonly rooms: PowerRoomStatus[];
  readonly activeRoomIds: readonly string[];
}
export const POWER_BALANCE = { schemaVersion: 1, cableCost: 15, riserCost: 35 } as const;
const cellKey = (x: number, y: number): string => x + ':' + y;
const orderedCables = (a: PowerCable, b: PowerCable) => a.y - b.y || a.x - b.x;
const defaultPriority = (room: Room): PowerPriority => {
  if (room.type === 'command' || room.type === 'medbay') return 0;
  if (room.type === 'habitat' || room.type === 'hydroponics' || room.type === 'waterTreatment' ||
      room.type === 'kitchen' || room.type === 'ventilation') return 1;
  return 2;
};

export function starterPower(): PowerSnapshot {
  // The default shelter's generator (1,-2) feeds rooms on (-1) through explicit
  // risers at x=1; an elevator at x=0 is deliberately NOT a conductor.
  return { schemaVersion: 1, mode: 'physical', overrides: [], cables: [
    { x: 1, y: -2, riser: true },
    ...Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: -1, riser: i === 0 }))
  ] };
}
export function legacyPower(): PowerSnapshot {
  return { schemaVersion: 1, mode: 'legacy', cables: [], overrides: [] };
}

export function restorePower(value: unknown, rooms: readonly Room[], terrain: TerrainMap): PowerSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<PowerSnapshot>;
  if (data.schemaVersion !== 1 || (data.mode !== 'physical' && data.mode !== 'legacy') ||
      !Array.isArray(data.cables) || !Array.isArray(data.overrides) ||
      data.cables.length > 14 * 7 || data.overrides.length > rooms.length) return null;
  const seen = new Set<string>();
  const cables: PowerCable[] = [];
  for (const wire of data.cables) {
    if (!wire || !isInsideWorld(wire.x, wire.y) || !terrain.isOpen(wire.x, wire.y) ||
        typeof wire.riser !== 'boolean') return null;
    const id = cellKey(wire.x, wire.y);
    if (seen.has(id)) return null;
    seen.add(id);
    cables.push({ x: wire.x, y: wire.y, riser: wire.riser });
  }
  const ids = new Set<string>();
  const overrides: PowerOverride[] = [];
  for (const setting of data.overrides) {
    const room = rooms.find(r => r.id === setting?.roomId);
    if (!room || ids.has(room.id) || ![0, 1, 2].includes(setting.priority) ||
        Math.abs(defaultPriority(room) - setting.priority) > 1) return null;
    ids.add(room.id);
    overrides.push({ roomId: room.id, priority: setting.priority });
  }
  return { schemaVersion: 1, mode: data.mode, cables: cables.sort(orderedCables),
    overrides: overrides.sort((a,b) => a.roomId.localeCompare(b.roomId)) };
}

/** Cost is charged by the caller only after this pure validator returns success. */
export function canWire(power: PowerSnapshot, terrain: TerrainMap, x: number, y: number,
                        riser: boolean): string | null {
  if (!isInsideWorld(x, y) || !terrain.isOpen(x, y))
    return 'کابل فقط در خانهٔ باز یا حفاری‌شده قابل نصب است.';
  const old = power.cables.find(c => c.x === x && c.y === y);
  if (old && (!riser || old.riser)) return 'این خانه قبلاً کابل مناسب دارد.';
  return null;
}
export function installWire(power: PowerSnapshot, terrain: TerrainMap, x: number, y: number,
                            riser = false): PowerSnapshot | null {
  if (canWire(power, terrain, x, y, riser)) return null;
  return { ...power, cables: [
    ...power.cables.filter(c => c.x !== x || c.y !== y),
    { x, y, riser }
  ].sort(orderedCables) };
}
export function removeWire(power: PowerSnapshot, x: number, y: number): PowerSnapshot | null {
  if (!power.cables.some(c => c.x === x && c.y === y)) return null;
  return { ...power, cables: power.cables.filter(c => c.x !== x || c.y !== y) };
}
export function setRoomPriority(power: PowerSnapshot, room: Room, priority: PowerPriority): PowerSnapshot | null {
  if (![0, 1, 2].includes(priority) || Math.abs(defaultPriority(room) - priority) > 1) return null;
  return { ...power, overrides: [
    ...power.overrides.filter(o => o.roomId !== room.id),
    { roomId: room.id, priority }
  ].sort((a,b) => a.roomId.localeCompare(b.roomId)) };
}

/** Deterministic connected components. Horizontal neighbors require two wires;
 * vertical neighbors also require two explicit riser connectors. */
/** Peak instantaneous circuit reservation, not a second inventory debit.
 * Water recipes spend two units when the 10s batch completes; kitchen recipes
 * debit inputs once at start; ventilation spends each 5s tick.
 * Override demand=0 when an appliance is deliberately disabled/damaged. */
export function appliancePowerDemand(room: Room): number {
  switch(room.type) {
    case 'waterTreatment': return WATER_CONFIG.recipe.power;
    case 'ventilation': return ventPower(room.level);
    case 'kitchen': return KITCHEN_CONFIG.minOperatingPower;
    case 'guardPost': return GUARD_CONFIG.power;
    case 'recreation': return RECREATION_CONFIG.power;
    default: return 0;
  }
}

export function allocatePower(power: PowerSnapshot, rooms: readonly Room[], modifiers: TechnologyModifiers,
  applianceDemand?: ReadonlyMap<string, number>): PowerAllocation {
  const sortedRooms = [...rooms].sort((a,b) => a.id.localeCompare(b.id));
  const flows = new Map(sortedRooms.map(r => {
    const base = getRoomPowerFlow(r, modifiers);
    const reserved = applianceDemand?.get(r.id) ?? appliancePowerDemand(r);
    return [r.id, { ...base, demand: base.demand + reserved }] as const;
  }));
  const priorities = new Map(power.overrides.map(o => [o.roomId, o.priority]));
  const priorityOf = (r: Room): PowerPriority => priorities.get(r.id) ?? defaultPriority(r);
  if (power.mode === 'legacy') {
    const statuses = sortedRooms.map(r => ({ roomId:r.id, networkId:'legacy',
      demand:flows.get(r.id)!.demand, production:flows.get(r.id)!.production,
      priority:priorityOf(r), status:'legacy' as const }));
    const supply = statuses.reduce((n,r) => n + r.production,0);
    const demand = statuses.reduce((n,r) => n + r.demand,0);
    return { mode: power.mode, rooms: statuses, activeRoomIds: sortedRooms.map(r => r.id),
      networks: [{ id:'legacy', supply, demand, allocated:demand, shortage:Math.max(0,demand-supply),
        roomIds:sortedRooms.map(r => r.id) }] };
  }
  const wires = new Map(power.cables.map(c => [cellKey(c.x,c.y), c]));
  const visited = new Set<string>();
  const components: Array<{ id: string; cells: Set<string> }> = [];
  for (const cable of [...power.cables].sort(orderedCables)) {
    const start = cellKey(cable.x,cable.y);
    if (visited.has(start)) continue;
    const component = { id: 'network-' + start, cells: new Set<string>() };
    const queue = [start];
    visited.add(start);
    for (let i=0;i<queue.length;i++) {
      const current = queue[i], here = wires.get(current)!;
      component.cells.add(current);
      for (const [x,y,vertical] of [
        [here.x-1,here.y,false], [here.x+1,here.y,false],
        [here.x,here.y-1,true], [here.x,here.y+1,true]
      ] as const) {
        const neighbor = cellKey(x,y), next = wires.get(neighbor);
        if (!next || visited.has(neighbor) || (vertical && (!here.riser || !next.riser))) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  const componentOf = new Map<string,string>();
  for (const c of components) for (const key of c.cells) componentOf.set(key,c.id);
  const roomNetwork = (room: Room): string | null => {
    const ids = new Set<string>();
    for (let y=room.y;y<room.y+room.height;y++)
      for (let x=room.x;x<room.x+room.width;x++) {
        const id = componentOf.get(cellKey(x,y));
        if (id) ids.add(id);
      }
    // A multi-cell room with two independent wired ports is a powered device,
    // not a copper bridge; it does not join the circuits.
    return [...ids].sort()[0] ?? null;
  };
  const networkByRoom = new Map(sortedRooms.map(r => [r.id, roomNetwork(r)]));
  const statusById = new Map<string, PowerRoomStatus>();
  const networks: PowerNetwork[] = [];
  for (const component of components) {
    const members = sortedRooms.filter(r => networkByRoom.get(r.id) === component.id);
    const supply = members.reduce((n,r) => n + flows.get(r.id)!.production, 0);
    const demand = members.reduce((n,r) => n + flows.get(r.id)!.demand, 0);
    let available = supply, allocated = 0;
    const consumers = members.filter(r => flows.get(r.id)!.demand > 0)
      .sort((a,b) => priorityOf(a)-priorityOf(b) || a.id.localeCompare(b.id));
    const powered = new Set<string>();
    for (const room of consumers) {
      const required = flows.get(room.id)!.demand;
      if (supply > 0 && available >= required) {
        available -= required;
        allocated += required;
        powered.add(room.id);
      }
    }
    for (const room of members) {
      const flow = flows.get(room.id)!;
      statusById.set(room.id, { roomId:room.id, networkId:component.id,
        production:flow.production,demand:flow.demand,priority:priorityOf(room),
        status: (supply > 0 && (flow.demand === 0 || powered.has(room.id))) ? 'online' : 'shed' });
    }
    networks.push({id:component.id, supply,demand,allocated,shortage:demand-allocated,
      roomIds:members.map(r=>r.id)});
  }
  for (const room of sortedRooms) {
    if (statusById.has(room.id)) continue;
    const flow = flows.get(room.id)!;
    statusById.set(room.id, { roomId:room.id, networkId:null, demand:flow.demand,
      production:flow.production, priority:priorityOf(room), status:'disconnected' });
  }
  const statuses = sortedRooms.map(r => statusById.get(r.id)!);
  return { mode:power.mode, networks, rooms:statuses,
    activeRoomIds:statuses.filter(s => s.status === 'online').map(s => s.roomId) };
}
export function canActivateNetwork(power: PowerSnapshot, rooms: readonly Room[],
  modifiers: TechnologyModifiers, applianceDemand?: ReadonlyMap<string, number>): boolean {
  if (power.mode === 'physical') return true;
  const proposal = allocatePower({ ...power, mode:'physical' }, rooms, modifiers, applianceDemand);
  return proposal.rooms.every(r => r.status === 'online');
}
