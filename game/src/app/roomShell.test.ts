import { describe, expect, it } from 'vitest';
import { roomShellBounds, ROOM_SEAM_PX, ROOM_SHELL_INSET_PX } from './roomShell';
import { toPixels, WORLD } from '../modules/world/grid';

describe('unified modular room shell', () => {
  it('keeps a genuine narrow dark seam between directly adjacent rooms', () => {
    const a = roomShellBounds({ x: 3, y: -1, width: 2, height: 1 });
    const b = roomShellBounds({ x: 5, y: -1, width: 3, height: 1 });
    expect(ROOM_SEAM_PX).toBe(2);
    expect(b.left - (a.left + a.width)).toBe(ROOM_SEAM_PX);
    expect(a.top).toBe(b.top);
    expect(a.height).toBe(b.height);
  });

  it('also separates stacked rooms by the same visual seam', () => {
    const bottom = roomShellBounds({ x: 6, y: -2, width: 2, height: 1 });
    const top = roomShellBounds({ x: 6, y: -1, width: 2, height: 1 });
    expect(bottom.top - (top.top + top.height)).toBe(ROOM_SEAM_PX);
  });

  it('preserves room footprint boundaries for 1, 2 and 3 grid cells', () => {
    for (const width of [1, 2, 3]) {
      const room = { x: 4, y: -2, width, height: 1 };
      const a = roomShellBounds(room);
      const origin = toPixels(room.x, room.y);
      expect(a.left).toBe(origin.left + ROOM_SHELL_INSET_PX);
      expect(a.top).toBe(origin.top + ROOM_SHELL_INSET_PX);
      expect(a.width).toBe(width * WORLD.cellSize - ROOM_SEAM_PX);
      expect(a.height).toBe(WORLD.cellSize - ROOM_SEAM_PX);
      expect(a.left + a.width).toBe(origin.left + width * WORLD.cellSize - ROOM_SHELL_INSET_PX);
    }
  });

  it('does not visually join empty building cells into hidden corridors', () => {
    const first = roomShellBounds({ x: 1, y: -1, width: 2, height: 1 });
    const distant = roomShellBounds({ x: 4, y: -1, width: 2, height: 1 });
    expect(distant.left - (first.left + first.width)).toBe(WORLD.cellSize + ROOM_SEAM_PX);
  });
});
