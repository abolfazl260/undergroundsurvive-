import { describe, expect, it } from 'vitest';
import { TerrainMap } from './terrain';

describe('terrain excavation and floors', () => {
  it('keeps the surface visible, starter cells open and deep soil closed', () => {
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

  it('blocks direct and repeated requests to unlock above-ground floors', () => {
    const t = new TerrainMap();
    const before = t.snapshot();
    expect(t.unlockNextFloor().ok).toBe(false);
    expect(t.unlockNextFloor().ok).toBe(false);
    expect(t.snapshot()).toEqual(before);
    expect(t.isOpen(0, 1)).toBe(false);
  });

  it('preserves previously unlocked upper terrain in valid legacy snapshots', () => {
    const original = new TerrainMap({ highestFloor: 1, excavated: [{ x: 5, y: -1 }] });
    expect(original.isOpen(0, 1)).toBe(true);
    expect(TerrainMap.restore(original.snapshot())?.snapshot()).toEqual(original.snapshot());
    expect(original.unlockNextFloor().ok).toBe(false);
    expect(original.highestFloor).toBe(1);
    expect(TerrainMap.restore({ highestFloor: 4, excavated: [] })).toBeNull();
    expect(TerrainMap.restore({ highestFloor: 0, excavated: [{ x: 0, y: 0 }] })).toBeNull();
    expect(TerrainMap.restore({ highestFloor: 0, excavated: [{ x: 1, y: -1 }, { x: 1, y: -1 }] })).toBeNull();
  });
});
