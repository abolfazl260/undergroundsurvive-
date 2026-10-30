import type { Room } from '../modules/building/placement';
import { toPixels, WORLD } from '../modules/world/grid';

/**
 * A visual door passage across two existing room shells. It straddles the
 * common wall; it does not take up a new building cell or alter navigation.
 */
export interface RoomCorridor {
  readonly leftRoomId: string;
  readonly rightRoomId: string;
  readonly floor: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

// Narrow enough to leave both room interiors visible, wide enough for a
// legible industrial doorway at the game's standard/mobile zoom levels.
export const CORRIDOR_WIDTH = 14;
export const CORRIDOR_HEIGHT = 32;
export const CORRIDOR_TOP_INSET = 19;

/**
 * Find only horizontally adjacent rooms sharing an actual floor. Each
 * left-right pair is emitted once, regardless of snapshot/array order.
 * Vertical and diagonal neighbors or separated cells get no connector.
 */
type CorridorRoom = Pick<Room, 'id' | 'x' | 'y' | 'width' | 'height'>;
export function roomCorridors(rooms: readonly CorridorRoom[]): RoomCorridor[] {
  const byLeftEdge = new Map<number, CorridorRoom[]>();
  for (const room of rooms) {
    const column = byLeftEdge.get(room.x) ?? [];
    column.push(room);
    byLeftEdge.set(room.x, column);
  }
  const corridors: RoomCorridor[] = [];
  for (const room of rooms) {
    const neighboring = byLeftEdge.get(room.x + room.width) ?? [];
    for (const next of neighboring) {
      const firstFloor = Math.max(room.y, next.y);
      const endFloor = Math.min(room.y + room.height, next.y + next.height);
      for (let floor = firstFloor; floor < endFloor; floor++) {
        const boundary = toPixels(next.x, floor);
        corridors.push({
          leftRoomId: room.id,
          rightRoomId: next.id,
          floor,
          left: boundary.left - CORRIDOR_WIDTH / 2,
          top: boundary.top + CORRIDOR_TOP_INSET,
          width: CORRIDOR_WIDTH,
          height: CORRIDOR_HEIGHT
        });
      }
    }
  }
  return corridors;
}

/** The doorway overlays only the seam, never the full original room frame. */
export function corridorFitsWithinFloor(corridor: RoomCorridor): boolean {
  return corridor.height > 0 && CORRIDOR_TOP_INSET + corridor.height <= WORLD.cellSize;
}
