import { connectedSegments } from '../world/elevators';
import type { TerrainMap } from '../world/terrain';
import type { Room, PlacementResult } from './placement';

/** Full horizontal edge contact on an overlapping floor; diagonal and vertical contact do not count. */
function touchesSide(a: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
                     b: Pick<Room, 'x' | 'y' | 'width' | 'height'>): boolean {
  return a.y < b.y + b.height && b.y < a.y + a.height &&
    (a.x + a.width === b.x || b.x + b.width === a.x);
}

/**
 * Reachability is recomputed against the complete candidate layout. Elevator segments
 * are roots only if connected to the main surface shaft (including historical shafts).
 * Order in a saved snapshot never affects the result.
 */
export function connectedRoomIds(rooms: readonly Room[], terrain: TerrainMap): Set<string> {
  const connected = new Set<string>();
  const queue: Array<Pick<Room, 'x' | 'y' | 'width' | 'height'>> =
    connectedSegments(terrain.elevators).map((segment) => ({ ...segment, width: 1, height: 1 }));

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const room of rooms) {
      if (connected.has(room.id) || !touchesSide(current, room)) continue;
      connected.add(room.id);
      queue.push(room);
    }
  }
  return connected;
}

export const CONNECTED_ROOM_REASON = 'اتاق باید به آسانسور یا یک اتاق متصل در همین طبقه بچسبد.';
export const DISCONNECTION_REASON = 'این تغییر اتصال اتاق‌های دیگر به آسانسور را قطع می‌کند.';

/** A new or moved room must itself have a complete route back to an elevator. */
export function validateRoomConnection(rooms: readonly Room[], room: Room, terrain: TerrainMap): PlacementResult {
  return connectedRoomIds([...rooms, room], terrain).has(room.id)
    ? { ok: true }
    : { ok: false, reason: CONNECTED_ROOM_REASON };
}

/** Legacy disconnected rooms are preserved, but no operation may isolate a previously reachable room. */
export function preserveRoomConnections(before: readonly Room[], after: readonly Room[],
                                        terrain: TerrainMap): PlacementResult {
  const wasConnected = connectedRoomIds(before, terrain);
  const nowConnected = connectedRoomIds(after, terrain);
  return after.some((room) => wasConnected.has(room.id) && !nowConnected.has(room.id))
    ? { ok: false, reason: DISCONNECTION_REASON } : { ok: true };
}
