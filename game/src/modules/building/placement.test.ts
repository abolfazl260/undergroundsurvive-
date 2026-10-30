import { describe, expect, it } from 'vitest';
import { BuildingLayout } from './layout';
import { validatePlacement } from './placement';
import { canConstructAtLevel, canEditFootprint, LEGACY_SURFACE_POLICY } from './constructionPolicy';
import { toCell, toPixels } from '../world/grid';

function oldSurfaceLayout(): BuildingLayout {
  const current = new BuildingLayout().snapshot();
  const old = new BuildingLayout({
    ...current, terrain: { ...current.terrain, highestFloor: 1, elevators: [...current.terrain.elevators!, {x:0,y:1}] }
  }, LEGACY_SURFACE_POLICY);
  expect(old.place('habitat', 2, 0).ok).toBe(true);
  expect(old.place('habitat', 2, 1).ok).toBe(true);
  return old;
}

describe('grid mapping', () => {
  it('round-trips a cell in each vertical zone', () => {
    for (const y of [-4, -2, 0, 2]) {
      const p = toPixels(5, y);
      expect(toCell(p.left + 12, p.top + 12)).toEqual({ x: 5, y });
    }
  });
});

describe('underground-only construction', () => {
  it('restricts all positive and zero levels via one policy, with future opt-in', () => {
    expect([-4, -2, -1].every((y) => canConstructAtLevel(y))).toBe(true);
    expect([0, 1, 2].every((y) => canConstructAtLevel(y))).toBe(false);
    expect(canConstructAtLevel(0, LEGACY_SURFACE_POLICY)).toBe(true);
    expect(canEditFootprint(-1, 2)).toBe(false);
    expect(canEditFootprint(-2, 2)).toBe(true);
    expect(canEditFootprint(-1, 2, LEGACY_SURFACE_POLICY)).toBe(true);
  });

  it('starts completely underground, rejects surface/sky and preserves normal collision rules', () => {
    const layout = new BuildingLayout();
    expect(layout.rooms.every((room) => room.y < 0)).toBe(true);
    expect(validatePlacement([], 'habitat', 0, 0).ok).toBe(false);
    expect(validatePlacement([], 'habitat', 0, 1).ok).toBe(false);
    expect(layout.place('medbay', 8, 0).ok).toBe(false);
    expect(layout.place('medbay', 8, 1).ok).toBe(false);
    expect(layout.place('habitat', 5, -1).ok).toBe(false);
    expect(layout.place('habitat', 13, -1).ok).toBe(false);
    expect(layout.place('medbay', 8, -1).ok).toBe(true);
    expect(layout.place('medbay', 8, -1).ok).toBe(false);
  });

  it('keeps underground excavation, adjacency, and placement intact', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 5, -3).ok).toBe(false);
    expect(layout.dig(5, -3).ok).toBe(false);
    expect(layout.dig(5, -2).ok).toBe(true);
    expect(layout.dig(6, -2).ok).toBe(true);
    expect(layout.buildElevator(0,-3).ok).toBe(true);
    expect(layout.dig(1, -3).ok).toBe(true);
    expect(layout.dig(2, -3).ok).toBe(true);
    expect(layout.place('medbay', 1, -3).ok).toBe(true);
    expect(layout.dig(5, 0).ok).toBe(false);
  });

  it('rejects the legacy upward-floor API in both model and terrain without mutations', () => {
    const layout = new BuildingLayout();
    const before = layout.snapshot();
    expect(layout.unlockFloor().ok).toBe(false);
    expect(layout.terrain.unlockNextFloor().ok).toBe(false);
    expect(layout.snapshot()).toEqual(before);
  });

  it('allows moves and upgrades underground but cannot move a room to the surface', () => {
    const layout = new BuildingLayout();
    expect(layout.place('medbay', 8, -1).ok).toBe(true);
    const id = layout.getRoomAt(8, -1)!.id;
    expect(layout.move(id, 9, -1).ok).toBe(false);
    expect(layout.move(id, 9, 0).ok).toBe(false);
    expect(layout.getRoomAt(8, -1)?.id).toBe(id);
    expect(layout.move('initial-command', 4, -1).ok).toBe(false);
    expect(layout.upgrade(id).ok).toBe(true);
    expect(layout.upgrade(id).ok).toBe(true);
    expect(layout.upgrade(id).ok).toBe(false);
    expect(layout.remove(id).ok).toBe(true);
  });

  it('restores supported historical surface rooms regardless of original order, read-only', () => {
    const old = oldSurfaceLayout();
    expect(old.place('storage', 8, 0).ok).toBe(true);
    const upperId = old.getRoomAt(2, 1)!.id;
    const supportId = old.getRoomAt(8, 0)!.id;
    expect(old.move(upperId, 8, 1).ok).toBe(true);
    const saved = old.snapshot();
    expect(saved.rooms.findIndex((r) => r.id === upperId))
      .toBeLessThan(saved.rooms.findIndex((r) => r.id === supportId));
    const legacy = BuildingLayout.restore(saved)!;
    expect(legacy.snapshot()).toEqual(saved);
    const reversed = { ...saved, rooms: [...saved.rooms].reverse() };
    expect(BuildingLayout.restore(reversed)?.snapshot()).toEqual(reversed);

    const before = legacy.snapshot();
    expect(legacy.place('medbay', 10, 0).ok).toBe(false);
    expect(legacy.place('medbay', 8, 2).ok).toBe(false);
    expect(legacy.move(upperId, 9, 1).ok).toBe(false);
    expect(legacy.move(supportId, 8, -1).ok).toBe(false);
    expect(legacy.remove(upperId).ok).toBe(false);
    expect(legacy.upgrade(supportId).ok).toBe(false);
    expect(legacy.snapshot()).toEqual(before);
    expect(legacy.place('medbay', 8, -1).ok).toBe(true);
  });

  it('rejects overlaps, unsupported upper rooms and unexcavated rooms on restore', () => {
    const saved = oldSurfaceLayout().snapshot();
    const overlap = structuredClone(saved);
    overlap.rooms.push({ ...overlap.rooms[0], id: 'overlapping-command' });
    expect(BuildingLayout.restore(overlap)).toBeNull();

    const unsupported = structuredClone(saved);
    unsupported.rooms.find((r) => r.y === 1)!.x = 8;
    expect(BuildingLayout.restore(unsupported)).toBeNull();

    const unexcavated = structuredClone(saved);
    unexcavated.rooms.find((r) => r.id === 'initial-habitat')!.y = -3;
    expect(BuildingLayout.restore(unexcavated)).toBeNull();
  });

  it('saves, loads, rejects malformed data and resets to underground starters', () => {
    const layout = new BuildingLayout();
    layout.dig(5, -2);
    layout.place('medbay', 8, -1);
    const saved = layout.snapshot();
    expect(BuildingLayout.restore(saved)?.snapshot()).toEqual(saved);
    expect(BuildingLayout.restore({ ...saved, schemaVersion: 99 })).toBeNull();
    expect(BuildingLayout.restore({ ...saved, rooms: [...saved.rooms, saved.rooms[0]] })).toBeNull();
    layout.reset();
    expect(layout.terrain.highestFloor).toBe(0);
    expect(layout.terrain.isOpen(5, -2)).toBe(false);
    expect(layout.rooms).toHaveLength(4);
    expect(layout.rooms.every((room) => room.y < 0)).toBe(true);
  });
});
