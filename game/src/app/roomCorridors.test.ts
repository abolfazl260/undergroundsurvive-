import { describe, expect, it } from 'vitest';
import { toPixels, WORLD } from '../modules/world/grid';
import { CORRIDOR_HEIGHT, CORRIDOR_WIDTH, corridorFitsWithinFloor, roomCorridors } from './roomCorridors';

const room = (id: string, x: number, y: number, width = 2, height = 1) =>
  ({ id, x, y, width, height });

describe('compact room-to-room corridor visuals', () => {
  it('adds a single centered doorway when two independent room frames touch', () => {
    const a = room('habitat', 3, -1);
    const b = room('command', 5, -1, 3);
    const [passage] = roomCorridors([a, b]);
    expect(roomCorridors([a, b])).toHaveLength(1);
    expect(roomCorridors([b, a])).toEqual([passage]);
    expect(passage).toMatchObject({
      leftRoomId: 'habitat', rightRoomId: 'command', floor: -1,
      width: CORRIDOR_WIDTH, height: CORRIDOR_HEIGHT
    });
    expect(passage.left + passage.width / 2).toBe(toPixels(5, -1).left);
    expect(corridorFitsWithinFloor(passage)).toBe(true);
  });

  it('creates no false corridor across gaps, corners, or between stacked rooms', () => {
    const a = room('a', 1, -1);
    expect(roomCorridors([a, room('gap', 4, -1)])).toEqual([]);
    expect(roomCorridors([a, room('corner', 3, -2)])).toEqual([]);
    expect(roomCorridors([a, room('above', 1, -2)])).toEqual([]);
    expect(roomCorridors([a, room('separate', 3, -3)])).toEqual([]);
  });

  it('connects both sides in a chain and tracks moves/removals from current room data', () => {
    const a = room('a', 1, -1), b = room('b', 3, -1), c = room('c', 5, -1);
    expect(roomCorridors([a, b, c]).map(c => [c.leftRoomId, c.rightRoomId]))
      .toEqual([['a', 'b'], ['b', 'c']]);
    expect(roomCorridors([a, c])).toEqual([]);
    expect(roomCorridors([a, { ...b, x: 7 }, c]).map(c => [c.leftRoomId, c.rightRoomId]))
      .toEqual([['c', 'b']]);
  });

  it('supports multi-level footprints without connecting non-overlapping floors', () => {
    const a = room('a', 0, -3, 2, 2);
    const b = room('b', 2, -2, 2, 2);
    const c = room('c', 4, -1, 2, 1);
    const doors = roomCorridors([a, b, c]);
    expect(doors.map(door => door.floor)).toEqual([-2, -1, -1]);
    expect(doors.every(corridorFitsWithinFloor)).toBe(true);
  });

  it('does not alter gameplay footprint, save positions, or add a pathfinding cell', () => {
    const original = [room('a', 2, -1), room('b', 4, -1)];
    const before = JSON.stringify(original);
    const corridor = roomCorridors(original)[0];
    expect(JSON.stringify(original)).toBe(before);
    expect(corridor.width).toBeLessThan(WORLD.cellSize / 2);
    expect(corridor.height).toBeLessThan(WORLD.cellSize);
    expect(corridor.left).toBeGreaterThan(toPixels(2, -1).left);
    expect(corridor.left + corridor.width).toBeLessThan(toPixels(6, -1).left);
  });

  it('renders nothing when there are no finished rooms', () => {
    expect(roomCorridors([])).toEqual([]);
  });
});
