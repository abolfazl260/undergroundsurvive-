import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import { LEGACY_SURFACE_POLICY } from '../building/constructionPolicy';
import { canWalkBetween, findRoomPath, ResidentNavigator, walkPoint } from './pathfinding';

describe('room pathfinding', () => {
  it('walks from the command room to the basement via excavated corridors', () => {
    const layout = new BuildingLayout();
    const route = findRoomPath(layout, { x: 6, y: -1 }, 'initial-power');
    expect(route).not.toBeNull();
    expect(route![0]).toEqual({ x: 6, y: -1 });
    expect(layout.getRoomAt(route!.at(-1)!.x, route!.at(-1)!.y)?.id).toBe('initial-power');
    for (let i = 1; i < route!.length; i++) {
      expect(canWalkBetween(layout, route![i - 1], route![i])).toBe(true);
    }
    expect(route!.some((cell) => cell.y === -2)).toBe(true);
  });

  it('cannot pass through solid ground or use stacked ordinary rooms as ladders', () => {
    const current = new BuildingLayout().snapshot();
    const layout = new BuildingLayout({
      ...current, terrain: { ...current.terrain, highestFloor: 1, elevators: [...current.terrain.elevators!, {x:0,y:1}] }
    }, LEGACY_SURFACE_POLICY);
    expect(canWalkBetween(layout, { x: 5, y: -1 }, { x: 5, y: -2 })).toBe(false);
    expect(layout.place('habitat', 2, 0).ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    expect(canWalkBetween(layout, { x: 2, y: 0 }, { x: 2, y: 1 })).toBe(false);
    const upper = layout.getRoomAt(2, 1)!;
    // An unlocked upper floor is not an aerial walkway. Without a lift or
    // staircase the room is built but not reachable from the ground.
    const route = findRoomPath(layout, { x: 6, y: -1 }, upper.id);
    expect(route).toBeNull();
    expect(canWalkBetween(layout, { x: 2, y: 1 }, { x: 3, y: 1 })).toBe(true);
    expect(canWalkBetween(layout, { x: 3, y: 1 }, { x: 4, y: 1 })).toBe(false);
  });

  it('returns null for unknown, invalid or disconnected room destinations', () => {
    const layout = new BuildingLayout();
    expect(findRoomPath(layout, { x: 6, y: -1 }, 'missing')).toBeNull();
    expect(findRoomPath(layout, { x: -1, y: -1 }, 'initial-habitat')).toBeNull();
    const snapshot = layout.snapshot();
    snapshot.terrain.excavated.push({ x: 5, y: -3 }, { x: 6, y: -3 });
    snapshot.rooms.push({
      id: 'isolated', type: 'medbay', x: 5, y: -3, width: 2, height: 1, level: 1
    });
    expect(findRoomPath(new BuildingLayout(snapshot), { x: 6, y: -1 }, 'isolated')).toBeNull();
  });

  it('moves continuously, arrives, and supports immediate reduced-motion completion', () => {
    const layout = new BuildingLayout();
    const resident = new ResidentNavigator(layout, { x: 6, y: -1 });
    const start = resident.position;
    expect(resident.goToRoom('initial-power')).toBe(true);
    expect(resident.isMoving).toBe(true);
    resident.advance(200);
    expect(resident.position).not.toEqual(start);
    let arrived = false;
    for (let i = 0; i < 150; i++) arrived = resident.advance(100) || arrived;
    expect(arrived).toBe(true);
    expect(resident.isMoving).toBe(false);
    expect(layout.getRoomAt(resident.currentCell()!.x, resident.currentCell()!.y)?.id).toBe('initial-power');
    expect(resident.goToRoom('initial-habitat')).toBe(true);
    resident.finishImmediately();
    expect(resident.isMoving).toBe(false);
    expect(layout.getRoomAt(resident.currentCell()!.x, resident.currentCell()!.y)?.id).toBe('initial-habitat');
  });

  it('replans on layout changes and cancels a removed destination', () => {
    const layout = new BuildingLayout();
    const resident = new ResidentNavigator(layout, { x: 6, y: -1 });
    expect(resident.goToRoom('initial-garden')).toBe(true);
    expect(layout.move('initial-garden', 8, -1).ok).toBe(false);
    expect(resident.refresh()).toBe(true);
    const end = resident.remainingCells.at(-1)!;
    expect(layout.getRoomAt(end.x, end.y)?.id).toBe('initial-garden');
    expect(layout.place('medbay', 8, -1).ok).toBe(true);
    const id = layout.getRoomAt(8, -1)!.id;
    expect(resident.goToRoom(id)).toBe(true);
    expect(layout.remove(id).ok).toBe(true);
    expect(resident.refresh()).toBe(false);
    expect(resident.destinationId).toBeNull();
  });

  it('rejects unreachable retargets without interrupting an existing route', () => {
    const layout = new BuildingLayout();
    const resident = new ResidentNavigator(layout, { x: 6, y: -1 });
    expect(resident.goToRoom('initial-power')).toBe(true);
    expect(resident.goToRoom('not-a-room')).toBe(false);
    expect(resident.destinationId).toBe('initial-power');
    expect(walkPoint({ x: 1, y: 0 })).toEqual({ x: 183, y: 294 });
  });
});
