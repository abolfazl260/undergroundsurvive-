import { toPixels, WORLD } from '../modules/world/grid';
import type { Room } from '../modules/building/placement';

/**
 * A universal, visual-only envelope for every room (including 2- and 3-cell
 * rooms). One pixel is left clear on each side: neighboring module frames are
 * separated by only two world pixels, not by a hallway or a vacant grid cell.
 *
 * Keep construction, collision, save coordinates, and pathfinding on the full
 * grid footprint. This helper is solely for rendering and previews.
 */
export const ROOM_SEAM_PX = 2;
export const ROOM_SHELL_INSET_PX = ROOM_SEAM_PX / 2;
export type RoomFootprint = Pick<Room, 'x' | 'y' | 'width' | 'height'>;

export function roomShellBounds(room: RoomFootprint): {
  left: number; top: number; width: number; height: number
} {
  const { left, top } = toPixels(room.x, room.y);
  return {
    left: left + ROOM_SHELL_INSET_PX,
    top: top + ROOM_SHELL_INSET_PX,
    width: room.width * WORLD.cellSize - ROOM_SEAM_PX,
    height: room.height * WORLD.cellSize - ROOM_SEAM_PX
  };
}
