import { isInsideWorld } from '../world/grid';
import { ROOM_DEFINITIONS, type RoomType } from './catalog';

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

export function validatePlacement(
  rooms: readonly Room[],
  type: RoomType,
  x: number,
  y: number
): PlacementResult {
  const definition = ROOM_DEFINITIONS[type];
  for (let dx = 0; dx < definition.width; dx++) {
    for (let dy = 0; dy < definition.height; dy++) {
      if (!isInsideWorld(x + dx, y + dy)) {
        return { ok: false, reason: 'محدودهٔ ساخت خارج از زمین است.' };
      }
    }
  }
  const overlap = rooms.some((room) =>
    x < room.x + room.width && x + definition.width > room.x &&
    y < room.y + room.height && y + definition.height > room.y
  );
  return overlap
    ? { ok: false, reason: 'این محل با یک اتاق دیگر تداخل دارد.' }
    : { ok: true };
}

