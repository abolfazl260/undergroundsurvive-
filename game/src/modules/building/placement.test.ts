import { describe, expect, it } from 'vitest';
import { BuildingLayout } from './layout';
import { validatePlacement } from './placement';
import { toCell, toPixels } from '../world/grid';

describe('grid mapping', () => {
  it('round-trips a cell in each vertical zone', () => {
    for (const y of [-4, -2, 0, 2]) {
      const p = toPixels(5, y);
      expect(toCell(p.left + 12, p.top + 12)).toEqual({ x: 5, y });
    }
  });
});

describe('building placement, floors and terrain', () => {
  it('builds on the surface and rejects overlapping/out-of-bounds rooms', () => {
    const layout = new BuildingLayout();
    expect(validatePlacement([], 'habitat', 0, 0).ok).toBe(true);
    expect(layout.place('habitat', 5, -1).ok).toBe(false);
    expect(layout.place('habitat', 13, 0).ok).toBe(false);
    expect(layout.place('medbay', 8, 0).ok).toBe(true);
    expect(layout.place('medbay', 8, 0).ok).toBe(false);
  });

  it('requires excavation under the surface before underground construction', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 5, -3).ok).toBe(false);
    expect(layout.dig(5, -3).ok).toBe(false);
    expect(layout.dig(5, -2).ok).toBe(true);
    expect(layout.dig(6, -2).ok).toBe(true);
    expect(layout.dig(5, -3).ok).toBe(true);
    expect(layout.dig(6, -3).ok).toBe(true);
    expect(layout.place('medbay', 5, -3).ok).toBe(true);
  });

  it('unlocks above-ground floors and requires support beneath every cell', () => {
    const layout = new BuildingLayout();
    expect(layout.place('habitat', 2, 1).ok).toBe(false);
    expect(layout.unlockFloor().ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    expect(layout.place('habitat', 7, 1).ok).toBe(false);
    expect(layout.remove('initial-garden').ok).toBe(false);
  });

  it('moves ordinary rooms but protects structural supports and command', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 7, 0).ok).toBe(true);
    const id = layout.getRoomAt(7, 0)!.id;
    expect(layout.move(id, 8, 0).ok).toBe(true);
    expect(layout.getRoomAt(8, 0)?.id).toBe(id);
    expect(layout.move('initial-command', 5, 0).ok).toBe(false);
    layout.unlockFloor();
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    expect(layout.move('initial-garden', 4, 0).ok).toBe(false);
    expect(layout.remove('initial-garden').ok).toBe(false);
  });

  it('allows room upgrades and demolition without accidental reuse', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 8, 0).ok).toBe(true);
    const id = layout.getRoomAt(8, 0)!.id;
    expect(layout.upgrade(id).ok).toBe(true);
    expect(layout.upgrade(id).ok).toBe(true);
    expect(layout.upgrade(id).ok).toBe(false);
    expect(layout.getRoomAt(8, 0)?.level).toBe(3);
    expect(layout.remove(id).ok).toBe(true);
    expect(layout.remove('initial-command').ok).toBe(false);
  });

  it('saves, loads, checks malformed data and resets the map', () => {
    const layout = new BuildingLayout();
    layout.dig(5, -2);
    layout.unlockFloor();
    layout.place('medbay', 8, 0);
    const saved = layout.snapshot();
    expect(BuildingLayout.restore(saved)?.snapshot()).toEqual(saved);
    expect(BuildingLayout.restore({ ...saved, schemaVersion: 2 })).toBeNull();
    expect(BuildingLayout.restore({ ...saved, rooms: [...saved.rooms, saved.rooms[0]] })).toBeNull();
    layout.reset();
    expect(layout.terrain.highestFloor).toBe(0);
    expect(layout.terrain.isOpen(5, -2)).toBe(false);
    expect(layout.rooms).toHaveLength(4);
  });
});

