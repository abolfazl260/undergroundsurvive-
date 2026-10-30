import { describe, expect, it } from 'vitest';
import { BuildingLayout } from './layout';
import { validatePlacement } from './placement';
import { toCell, toPixels } from '../world/grid';

describe('grid mapping', () => {
  it('round-trips a cell in the underground area', () => {
    const point = toPixels(5, -2);
    expect(toCell(point.left + 20, point.top + 20)).toEqual({ x: 5, y: -2 });
  });
});

describe('room placement', () => {
  it('accepts a free location', () => {
    expect(validatePlacement([], 'habitat', 0, 0)).toEqual({ ok: true });
  });

  it('rejects a room outside the right edge', () => {
    expect(validatePlacement([], 'habitat', 13, 0).ok).toBe(false);
  });

  it('rejects overlap with existing rooms', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 5, -1).ok).toBe(false);
  });

  it('places valid rooms and can reset the demo', () => {
    const layout = new BuildingLayout();
    const initial = layout.rooms.length;
    expect(layout.place('medbay', 0, -4).ok).toBe(true);
    expect(layout.rooms.length).toBe(initial + 1);
    layout.reset();
    expect(layout.rooms.length).toBe(initial);
  });
});

