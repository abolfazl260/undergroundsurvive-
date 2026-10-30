import { isInsideWorld } from '../world/grid';
import { TerrainMap } from '../world/terrain';
import { ROOM_DEFINITIONS, type RoomType } from './catalog';
import { validateRoomConnection } from './connectivity';
import { canConstructAtLevel, UNDERGROUND_ONLY_POLICY, UNDERGROUND_ONLY_REASON, type ConstructionPolicy } from './constructionPolicy';

export interface Room {
  id: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
}
export type PlacementResult = { ok: true } | { ok: false; reason: string };
const occupied = (rooms: readonly Room[], x: number, y: number): boolean =>
  rooms.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);

export function validateFootprint(
  rooms: readonly Room[], type: RoomType, x: number, y: number,
  terrain: TerrainMap = new TerrainMap(), policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY
): PlacementResult {
  const definition = ROOM_DEFINITIONS[type];
  for (let dx = 0; dx < definition.width; dx++) {
    for (let dy = 0; dy < definition.height; dy++) {
      const cx = x + dx, cy = y + dy;
      if (!isInsideWorld(cx, cy))
        return { ok: false, reason: 'مکان ساخت خارج از نقشه است.' };
      if (!canConstructAtLevel(cy, policy))
        return { ok: false, reason: UNDERGROUND_ONLY_REASON };
      if (!terrain.isOpen(cx, cy))
        return { ok: false, reason: cy < 0 ? 'ابتدا زمین را حفاری کنید.' : 'ابتدا طبقهٔ جدید را باز کنید.' };
      if (terrain.isElevator(cx,cy)) return {ok:false,reason:'این محل با آسانسور تداخل دارد.'};
      if (occupied(rooms, cx, cy))
        return { ok: false, reason: 'این محل با اتاق دیگری تداخل دارد.' };
      if (cy > 0 && !occupied(rooms, cx, cy - 1))
        return { ok: false, reason: 'اتاق طبقهٔ بالا به تکیه‌گاه در تمام عرض نیاز دارد.' };
    }
  }
  return { ok: true };
}

/** Player operations require both a legal footprint and a horizontal elevator route. */
export function validatePlacement(
  rooms: readonly Room[], type: RoomType, x: number, y: number,
  terrain: TerrainMap = new TerrainMap(), policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY
): PlacementResult {
  const footprint = validateFootprint(rooms, type, x, y, terrain, policy);
  if (!footprint.ok) return footprint;
  // The historical surface policy is used solely for compatibility fixtures.
  if (y >= 0 && policy.allowSurfaceConstruction) return { ok: true };
  const definition = ROOM_DEFINITIONS[type];
  return validateRoomConnection(rooms, {
    id: '__candidate__', type, x, y,
    width: definition.width, height: definition.height, level: 1
  }, terrain);
}

export function hasStructuralSupport(rooms: readonly Room[], terrain: TerrainMap): boolean {
  return rooms.every((r) => {
    for (let dx = 0; dx < r.width; dx++) {
      for (let dy = 0; dy < r.height; dy++) {
        const x = r.x + dx, y = r.y + dy;
        if (!terrain.isOpen(x, y)) return false;
        if (y > 0 && !occupied(rooms.filter((other) => other.id !== r.id), x, y - 1))
          return false;
      }
    }
    return true;
  });
}

