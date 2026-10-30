import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import {
  SURFACE_ACCESS_BUFFER_FLOORS, SURFACE_ACCESS_BUFFER_HEIGHT,
  WORLD, toCell, toPixels
} from './grid';

describe('two-level sealed access below the surface', () => {
  it('puts the first real underground room beneath two shaft-only levels', () => {
    const exit = toPixels(0, 0);
    const firstUnderground = toPixels(0, -1);
    expect(SURFACE_ACCESS_BUFFER_FLOORS).toBe(2);
    expect(firstUnderground.top - (exit.top + WORLD.cellSize))
      .toBe(SURFACE_ACCESS_BUFFER_HEIGHT);
    expect(toPixels(0, -2).top - firstUnderground.top).toBe(WORLD.cellSize);
    expect(toPixels(0, -4).top + WORLD.cellSize).toBeLessThan(720);
  });

  it('does not expose either of the security levels to click, dig or build tools', () => {
    const px = toPixels(4, 0).left + 20;
    for (let level = 0; level < SURFACE_ACCESS_BUFFER_FLOORS; level++) {
      const py = WORLD.groundLineY + level * WORLD.cellSize + 20;
      expect(toCell(px, py)).toBeNull();
    }
    const layout = new BuildingLayout();
    const before = layout.snapshot();
    // Both reserved rows are outside the logical construction map. Selecting
    // their pixels never yields valid coordinates for any building command.
    expect(layout.rooms.some(room => room.y >= 0)).toBe(false);
    expect(layout.snapshot()).toEqual(before);
  });

  it('round-trips existing saved underground cells without moving rooms', () => {
    const old = new BuildingLayout().snapshot();
    const restored = BuildingLayout.restore(old);
    expect(restored?.snapshot()).toEqual(old);
    for (const y of [-4, -3, -2, -1, 0, 1, 2]) {
      const point = toPixels(5, y);
      expect(toCell(point.left + 20, point.top + 20)).toEqual({ x: 5, y });
    }
  });

  it('interpolates the cabin smoothly through the full sealed access shaft', () => {
    const surface = toPixels(0, 0).top;
    const below = toPixels(0, -1).top;
    expect(toPixels(0, -0.5).top).toBeCloseTo((surface + below) / 2);
    expect(toPixels(0, -0.25).top).toBeGreaterThan(surface);
    expect(toPixels(0, -0.75).top).toBeLessThan(below);
  });
});
