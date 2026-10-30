import { ROOM_DEFINITIONS, type BuildableRoomType, type RoomType } from './catalog';
import { MAX_ROOM_LEVEL } from './upgrades';
import { validatePlacement, hasStructuralSupport, type PlacementResult, type Room } from './placement';
import { TerrainMap, type TerrainSnapshot, type TerrainResult } from '../world/terrain';
import { isInsideWorld } from '../world/grid';
import { canConstructAtLevel, canEditFootprint, LEGACY_SURFACE_POLICY, LEGACY_SURFACE_READ_ONLY_REASON, UNDERGROUND_ONLY_POLICY, UNDERGROUND_ONLY_REASON, type ConstructionPolicy } from './constructionPolicy';

const STARTER_ROOMS: Room[] = [
  { id: 'initial-command', type: 'command', x: 5, y: -1, width: 3, height: 1, level: 1 },
  { id: 'initial-power', type: 'generator', x: 1, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-habitat', type: 'habitat', x: 10, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-garden', type: 'hydroponics', x: 11, y: -1, width: 2, height: 1, level: 1 }
];
export interface BaseSnapshot {
  schemaVersion: 1 | 2;
  terrain: TerrainSnapshot;
  rooms: Room[];
  nextRoomId: number;
}
export class BuildingLayout {
  private terrainState: TerrainMap;
  get terrain(): TerrainMap { return this.terrainState; }
  private data: Room[];
  private sequence: number;
  private readonly policy: ConstructionPolicy;

  constructor(snapshot?: BaseSnapshot, policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY) {
    this.policy = policy;
    this.terrainState = snapshot ? new TerrainMap(snapshot.terrain) : new TerrainMap();
    this.data = (snapshot?.rooms ?? STARTER_ROOMS).map((room) => ({ ...room }));
    this.sequence = snapshot?.nextRoomId ?? 0;
  }
  get rooms(): readonly Room[] { return this.data; }
  getRoomAt(x: number, y: number): Room | undefined {
    return this.data.find((r) => x >= r.x && x < r.x + r.width &&
      y >= r.y && y < r.y + r.height);
  }
  canEditRoom(room: Room): boolean {
    return canEditFootprint(room.y, room.height, this.policy);
  }
  canPlace(type: BuildableRoomType, x: number, y: number): PlacementResult {
    return validatePlacement(this.data, type, x, y, this.terrain, this.policy);
  }
  place(type: BuildableRoomType, x: number, y: number): PlacementResult {
    const result = this.canPlace(type, x, y);
    if (!result.ok) return result;
    const d = ROOM_DEFINITIONS[type];
    this.data.push({
      id: 'demo-' + ++this.sequence, type, x, y,
      width: d.width, height: d.height, level: 1
    });
    return { ok: true };
  }
  canMove(id: string, x: number, y: number): PlacementResult {
    const room = this.data.find((r) => r.id === id);
    if (!room || room.type === 'command')
      return { ok: false, reason: 'این اتاق قابل جابه‌جایی نیست.' };
    if (!this.canEditRoom(room))
      return { ok: false, reason: LEGACY_SURFACE_READ_ONLY_REASON };
    const others = this.data.filter((r) => r.id !== id);
    const result = validatePlacement(others, room.type, x, y, this.terrain, this.policy);
    if (!result.ok) return result;
    if (!hasStructuralSupport([...others, { ...room, x, y }], this.terrain))
      return { ok: false, reason: 'اتاق‌های بالاتر بدون تکیه‌گاه باقی می‌مانند.' };
    return { ok: true };
  }
  move(id: string, x: number, y: number): PlacementResult {
    const result = this.canMove(id, x, y);
    if (!result.ok) return result;
    const room = this.data.find((r) => r.id === id)!;
    room.x = x;
    room.y = y;
    return { ok: true };
  }
  remove(id: string): PlacementResult {
    const room = this.data.find((r) => r.id === id);
    if (!room || room.type === 'command')
      return { ok: false, reason: 'اتاق فرمان قابل حذف نیست.' };
    if (!this.canEditRoom(room))
      return { ok: false, reason: LEGACY_SURFACE_READ_ONLY_REASON };
    const remaining = this.data.filter((r) => r.id !== id);
    if (!hasStructuralSupport(remaining, this.terrain))
      return { ok: false, reason: 'این اتاق تکیه‌گاه طبقات بالایی است.' };
    this.data = remaining;
    return { ok: true };
  }
  upgrade(id: string): PlacementResult {
    const room = this.data.find((r) => r.id === id);
    if (!room) return { ok: false, reason: 'ابتدا یک اتاق را انتخاب کنید.' };
    if (!this.canEditRoom(room))
      return { ok: false, reason: LEGACY_SURFACE_READ_ONLY_REASON };
    if (room.level >= MAX_ROOM_LEVEL)
      return { ok: false, reason: 'این اتاق به بالاترین سطح آزمایشی رسیده است.' };
    room.level++;
    return { ok: true };
  }
  dig(x: number, y: number): TerrainResult {
    if (!canConstructAtLevel(y, this.policy)) return { ok: false, reason: UNDERGROUND_ONLY_REASON };
    return this.terrain.dig(x, y);
  }
  canBuildElevator(x:number,y:number): TerrainResult {
    // Surface connector is seeded/migrated; no new surface or sky construction.
    if (!canConstructAtLevel(y,this.policy)) return {ok:false,reason:UNDERGROUND_ONLY_REASON};
    if(this.getRoomAt(x,y)) return {ok:false,reason:'این محل با اتاق دیگری تداخل دارد.'};
    return this.terrain.canExtendElevator(x,y);
  }
  buildElevator(x:number,y:number): TerrainResult {
    const result=this.canBuildElevator(x,y); if(!result.ok)return result;
    this.terrainState=this.terrain.withElevator(x,y)!; return {ok:true};
  }
  removeElevator(): TerrainResult { return {ok:false,reason:'حذف یا انتقال شفت متصل مجاز نیست.'}; }
  unlockFloor(): TerrainResult { return this.terrain.unlockNextFloor(); }
  snapshot(): BaseSnapshot {
    return {
      schemaVersion: 2, terrain: this.terrain.snapshot(),
      rooms: this.data.map((room) => ({ ...room })), nextRoomId: this.sequence
    };
  }
  reset(): void {
    this.terrainState = new TerrainMap();
    this.data = STARTER_ROOMS.map((room) => ({ ...room }));
    this.sequence = 0;
  }
  static restore(value: unknown, policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY): BuildingLayout | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<BaseSnapshot>;
    // Legacy saves receive a collision-free connected shaft without deleting rooms.
    let terrainData = data.terrain;
    if (data.schemaVersion === 1 && terrainData && Array.isArray(data.rooms) && Array.isArray(terrainData.excavated)) {
      const low = Math.min(0,...terrainData.excavated.map(p=>p?.y),...data.rooms.map(r=>r?.y));
      const high = terrainData.highestFloor;
      if(!Number.isInteger(high) || high<0 || high>2 || data.rooms.length>160 || terrainData.excavated.length>56) return null;
      const x = Array.from({length:14},(_,i)=>i).find(x=>!data.rooms!.some(r=>r && x>=r.x&&x<r.x+r.width&&r.y<=high&&r.y+r.height>low));
      if (x===undefined || !Number.isInteger(low) || low < -4) return null;
      const elevators = Array.from({length:high-low+1},(_,i)=>({x,y:low+i}));
      const excavated = [...terrainData.excavated];
      for(const p of elevators) if(p.y<0&&!excavated.some(c=>c.x===p.x&&c.y===p.y)) excavated.push(p);
      terrainData = {...terrainData,excavated,elevators};
    }
    if(data.schemaVersion===2 && !Array.isArray(terrainData?.elevators)) return null;
    const terrain = TerrainMap.restore(terrainData);
    if ((data.schemaVersion !== 1 && data.schemaVersion !== 2) || !terrain || !Array.isArray(data.rooms) ||
        data.rooms.length > 160 || !Number.isInteger(data.nextRoomId) ||
        (data.nextRoomId ?? -1) < 0 || (data.nextRoomId ?? Infinity) > 1_000_000) return null;
    const rooms: Room[] = [], ids = new Set<string>();
    for (const r of data.rooms) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id ||
          ids.has(r.id) || !Object.hasOwn(ROOM_DEFINITIONS, r.type)) return null;
      const type = r.type as RoomType, def = ROOM_DEFINITIONS[type];
      if (!Number.isInteger(r.x) || !Number.isInteger(r.y) ||
          !isInsideWorld(r.x, r.y) || r.width !== def.width || r.height !== def.height ||
          !Number.isInteger(r.level) || r.level < 1 || r.level > MAX_ROOM_LEVEL) return null;
      rooms.push({ ...r });
      ids.add(r.id);
    }
    // Validate against the full set, not only rooms encountered earlier in the
    // snapshot. A moved upper room may rely on a support constructed later.
    // Exclude the current room to check collisions without self-overlap.
    for (const room of rooms) {
      const others = rooms.filter((other) => other.id !== room.id);
      if (!validatePlacement(others, room.type, room.x, room.y, terrain, LEGACY_SURFACE_POLICY).ok) return null;
    }
    if (!rooms.some((r) => r.id === 'initial-command' && r.type === 'command') ||
        !hasStructuralSupport(rooms, terrain)) return null;
    return new BuildingLayout({
      schemaVersion: 2, terrain: terrain.snapshot(),
      rooms, nextRoomId: data.nextRoomId!
    }, policy);
  }
}

