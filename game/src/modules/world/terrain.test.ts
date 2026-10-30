import { describe, expect, it } from 'vitest';
import { TerrainMap } from './terrain';

describe('terrain excavation and floors', () => {
  it('exposes the surface and starter corridors but not deep soil', () => {
    const t = new TerrainMap();
    expect(t.isOpen(4, 0)).toBe(true);
    expect(t.isOpen(5, -1)).toBe(true);
    expect(t.isOpen(5, -4)).toBe(false);
    expect(t.isOpen(4, 1)).toBe(false);
  });

  it('allows only adjacent underground excavation', () => {
    const t = new TerrainMap();
    expect(t.dig(5, -4).ok).toBe(false);
    expect(t.dig(5, -2).ok).toBe(true);
    expect(t.dig(5, -2).ok).toBe(false);
    expect(t.dig(5, -3).ok).toBe(true);
    expect(t.dig(1, 0).ok).toBe(false);
    expect(t.dig(-1, -1).ok).toBe(false);
  });

  it('unlocks floors sequentially up to world limits', () => {
    const t = new TerrainMap();
    expect(t.unlockNextFloor().ok).toBe(true);
    expect(t.isOpen(0, 1)).toBe(true);
    expect(t.isOpen(0, 2)).toBe(false);
    expect(t.unlockNextFloor().ok).toBe(true);
    expect(t.unlockNextFloor().ok).toBe(false);
  });

  it('restores valid terrain while rejecting duplicate/invalid coordinates', () => {
    const t = new TerrainMap();
    t.dig(5, -2);
    t.unlockNextFloor();
    expect(TerrainMap.restore(t.snapshot())?.snapshot()).toEqual(t.snapshot());
    expect(TerrainMap.restore({ highestFloor: 4, excavated: [] })).toBeNull();
    expect(TerrainMap.restore({ highestFloor: 0, excavated: [{ x: 0, y: 0 }] })).toBeNull();
    expect(TerrainMap.restore({ highestFloor: 0, excavated: [{ x: 1, y: -1 }, { x: 1, y: -1 }] })).toBeNull();
  });
});

