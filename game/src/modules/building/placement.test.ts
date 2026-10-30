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

  it('restores upper rooms supported by later-built rooms regardless of snapshot order', () => {
    const layout = new BuildingLayout();
    expect(layout.unlockFloor().ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    const upperId = layout.getRoomAt(2, 1)!.id;
    expect(layout.place('storage', 8, 0).ok).toBe(true);
    const supportId = layout.getRoomAt(8, 0)!.id;
    expect(layout.move(upperId, 8, 1).ok).toBe(true);

    const saved = layout.snapshot();
    expect(saved.rooms.findIndex((r) => r.id === upperId))
      .toBeLessThan(saved.rooms.findIndex((r) => r.id === supportId));
    expect(BuildingLayout.restore(saved)?.snapshot()).toEqual(saved);

    // Restoring must not require any particular ordering of valid rooms.
    const reversed = { ...saved, rooms: [...saved.rooms].reverse() };
    expect(BuildingLayout.restore(reversed)?.snapshot()).toEqual(reversed);
  });

  it('rejects overlapping, unsupported and unexcavated rooms after full-set validation', () => {
    const layout = new BuildingLayout();
    expect(layout.unlockFloor().ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    const saved = layout.snapshot();

    const overlap = structuredClone(saved);
    overlap.rooms.push({ ...overlap.rooms[0], id: 'overlapping-command' });
    expect(BuildingLayout.restore(overlap)).toBeNull();

    const unsupported = structuredClone(saved);
    unsupported.rooms.find((r) => r.y === 1)!.x = 8;
    expect(BuildingLayout.restore(unsupported)).toBeNull();

    const unexcavated = structuredClone(saved);
    const habitat = unexcavated.rooms.find((r) => r.id === 'initial-habitat')!;
    habitat.x = 5;
    habitat.y = -3;
    expect(BuildingLayout.restore(unexcavated)).toBeNull();
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

