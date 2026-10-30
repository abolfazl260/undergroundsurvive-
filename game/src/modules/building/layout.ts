import { ROOM_DEFINITIONS, type BuildableRoomType, type RoomType } from './catalog';
import { validatePlacement, hasStructuralSupport, type PlacementResult, type Room } from './placement';
import { TerrainMap, type TerrainSnapshot, type TerrainResult } from '../world/terrain';
import { isInsideWorld } from '../world/grid';

const STARTER_ROOMS: Room[] = [
  { id: 'initial-command', type: 'command', x: 5, y: -1, width: 3, height: 1, level: 1 },
  { id: 'initial-power', type: 'generator', x: 1, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-habitat', type: 'habitat', x: 10, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-garden', type: 'hydroponics', x: 2, y: 0, width: 2, height: 1, level: 1 }
];
export interface BaseSnapshot {
  schemaVersion: 1;
  terrain: TerrainSnapshot;
  rooms: Room[];
  nextRoomId: number;
}
export class BuildingLayout {
  terrain: TerrainMap;
  private data: Room[];
  private sequence: number;

  constructor(snapshot?: BaseSnapshot) {
    this.terrain = snapshot ? new TerrainMap(snapshot.terrain) : new TerrainMap();
    this.data = (snapshot?.rooms ?? STARTER_ROOMS).map((room) => ({ ...room }));
    this.sequence = snapshot?.nextRoomId ?? 0;
  }
  get rooms(): readonly Room[] { return this.data; }
  getRoomAt(x: number, y: number): Room | undefined {
    return this.data.find((r) => x >= r.x && x < r.x + r.width &&
      y >= r.y && y < r.y + r.height);
  }
  canPlace(type: BuildableRoomType, x: number, y: number): PlacementResult {
    return validatePlacement(this.data, type, x, y, this.terrain);
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
    const others = this.data.filter((r) => r.id !== id);
    const result = validatePlacement(others, room.type, x, y, this.terrain);
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
    const remaining = this.data.filter((r) => r.id !== id);
    if (!hasStructuralSupport(remaining, this.terrain))
      return { ok: false, reason: 'این اتاق تکیه‌گاه طبقات بالایی است.' };
    this.data = remaining;
    return { ok: true };
  }
  upgrade(id: string): PlacementResult {
    const room = this.data.find((r) => r.id === id);
    if (!room) return { ok: false, reason: 'ابتدا یک اتاق را انتخاب کنید.' };
    if (room.level >= 3)
      return { ok: false, reason: 'این اتاق به بالاترین سطح آزمایشی رسیده است.' };
    room.level++;
    return { ok: true };
  }
  dig(x: number, y: number): TerrainResult { return this.terrain.dig(x, y); }
  unlockFloor(): TerrainResult { return this.terrain.unlockNextFloor(); }
  snapshot(): BaseSnapshot {
    return {
      schemaVersion: 1, terrain: this.terrain.snapshot(),
      rooms: this.data.map((room) => ({ ...room })), nextRoomId: this.sequence
    };
  }
  reset(): void {
    this.terrain = new TerrainMap();
    this.data = STARTER_ROOMS.map((room) => ({ ...room }));
    this.sequence = 0;
  }
  static restore(value: unknown): BuildingLayout | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<BaseSnapshot>;
    const terrain = TerrainMap.restore(data.terrain);
    if (data.schemaVersion !== 1 || !terrain || !Array.isArray(data.rooms) ||
        data.rooms.length > 160 || !Number.isInteger(data.nextRoomId) ||
        (data.nextRoomId ?? -1) < 0 || (data.nextRoomId ?? Infinity) > 1_000_000) return null;
    const rooms: Room[] = [], ids = new Set<string>();
    for (const r of data.rooms) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id ||
          ids.has(r.id) || !Object.hasOwn(ROOM_DEFINITIONS, r.type)) return null;
      const type = r.type as RoomType, def = ROOM_DEFINITIONS[type];
      if (!Number.isInteger(r.x) || !Number.isInteger(r.y) ||
          !isInsideWorld(r.x, r.y) || r.width !== def.width || r.height !== def.height ||
          !Number.isInteger(r.level) || r.level < 1 || r.level > 3 ||
          !validatePlacement(rooms, type, r.x, r.y, terrain).ok) return null;
      rooms.push({ ...r });
      ids.add(r.id);
    }
    if (!rooms.some((r) => r.id === 'initial-command' && r.type === 'command') ||
        !hasStructuralSupport(rooms, terrain)) return null;
    return new BuildingLayout({
      schemaVersion: 1, terrain: terrain.snapshot(),
      rooms, nextRoomId: data.nextRoomId!
    });
  }
}

