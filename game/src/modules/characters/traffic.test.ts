import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import { LEGACY_SURFACE_POLICY } from '../building/constructionPolicy';
import { isWalkableCell, walkPoint } from './pathfinding';
import { ResidentTraffic } from './traffic';

const starter = [
  { id: 'a', cell: { x: 5, y: -1 } },
  { id: 'b', cell: { x: 6, y: -1 } },
  { id: 'c', cell: { x: 7, y: -1 } }
];

function assertSafe(layout: BuildingLayout, traffic: ResidentTraffic): void {
  for (const resident of traffic.residents) {
    expect(isWalkableCell(layout, resident.cell)).toBe(true);
    const footprint = [resident.cell, ...(resident.isWalking ? resident.remainingCells.slice(0, 1) : [])];
    for (const cell of footprint) {
      expect(isWalkableCell(layout, cell)).toBe(true);
    }
    const { x, y } = resident.position;
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    const centers = footprint.map(walkPoint);
    expect(centers.some((center) =>
      (Math.abs(center.x - x) < 0.0001 && Math.abs(center.y - y) < 0.0001) ||
      (resident.isWalking && (
        (centers.length === 2 && x >= Math.min(centers[0].x, centers[1].x) &&
         x <= Math.max(centers[0].x, centers[1].x) &&
         y >= Math.min(centers[0].y, centers[1].y) &&
         y <= Math.max(centers[0].y, centers[1].y))
      ))
    )).toBe(true);
  }
}

describe('nonblocking multi-resident navigation', () => {
  it('completes three concurrent destinations without resident collision blocking', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    expect(traffic.goToRoom('a', 'initial-power')).toBe(true);
    expect(traffic.goToRoom('b', 'initial-garden')).toBe(true);
    expect(traffic.goToRoom('c', 'initial-habitat')).toBe(true);
    const completed = new Set<string>();
    for (let i = 0; i < 600; i++) {
      traffic.advance(100).forEach((id) => completed.add(id));
      assertSafe(layout, traffic);
    }
    expect(completed.size).toBe(3);
    for (const agent of traffic.residents) {
      expect(agent.isMoving).toBe(false);
      expect(layout.getRoomAt(agent.cell.x, agent.cell.y)?.id).toBe(agent.destinationId);
    }
  });

  it('walks through a stationary resident without rerouting or waiting', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, [
      { id: 'a', cell: { x: 6, y: -1 } },
      { id: 'b', cell: { x: 5, y: -1 } }
    ]);
    expect(traffic.goToRoom('a', 'initial-habitat')).toBe(true);
    traffic.advance(100);
    expect(traffic.getResident('a')!.remainingCells[0]).toEqual({ x: 5, y: -1 });
    expect(traffic.getResident('a')!.isWaiting).toBe(false);
    traffic.advance(1000);
    expect(traffic.getResident('a')!.cell).toEqual(traffic.getResident('b')!.cell);
    expect(traffic.getResident('a')!.isWaiting).toBe(false);
    for (let i = 0; i < 120; i++) {
      traffic.advance(100);
      assertSafe(layout, traffic);
    }
    expect(traffic.getResident('a')!.isMoving).toBe(false);
    expect(layout.getRoomAt(traffic.getResident('a')!.cell.x, traffic.getResident('a')!.cell.y)?.id)
      .toBe('initial-habitat');
  });

  it('lets two residents move in opposite directions along the same corridor', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, [
      { id: 'a', cell: { x: 5, y: -1 } },
      { id: 'b', cell: { x: 6, y: -1 } }
    ]);
    expect(traffic.goToRoom('a', 'initial-command')).toBe(true);
    expect(traffic.goToRoom('b', 'initial-command')).toBe(true);
    const arrivals = new Set<string>();
    for (let i = 0; i < 40; i++) {
      traffic.advance(100).forEach(id => arrivals.add(id));
      expect(traffic.getResident('a')!.isWaiting).toBe(false);
      expect(traffic.getResident('b')!.isWaiting).toBe(false);
      assertSafe(layout, traffic);
    }
    expect(arrivals).toEqual(new Set(['a', 'b']));
    expect(traffic.getResident('a')!.cell).toEqual({ x: 7, y: -1 });
    expect(traffic.getResident('b')!.cell).toEqual({ x: 5, y: -1 });
  });

  it('accepts and restores multiple residents sharing a cell', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, [
      { id: 'a', cell: { x: 5, y: -1 } },
      { id: 'b', cell: { x: 5, y: -1 } }
    ]);
    expect(traffic.goToRoom('a', 'initial-garden')).toBe(true);
    expect(traffic.goToRoom('b', 'initial-garden')).toBe(true);
    const restored = ResidentTraffic.restore(layout, traffic.snapshot());
    expect(restored).not.toBeNull();
    expect(restored!.residents.map(r => r.cell)).toEqual([
      { x: 5, y: -1 }, { x: 5, y: -1 }
    ]);
    const arrivals = new Set<string>();
    for (let i = 0; i < 120; i++)
      restored!.advance(100).forEach(id => arrivals.add(id));
    expect(arrivals).toEqual(new Set(['a', 'b']));
  });

  it('keeps valid goals, rejects invalid retargeting, and cancels removed rooms', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    expect(traffic.goToRoom('a', 'initial-garden')).toBe(true);
    expect(traffic.goToRoom('a', 'absent')).toBe(false);
    expect(traffic.getResident('a')!.destinationId).toBe('initial-garden');
    expect(layout.move('initial-garden', 8, -1).ok).toBe(false);
    expect(traffic.refresh()).toEqual([]);
    expect(layout.place('habitat', 8, -1).ok).toBe(true);
    const addedId = layout.getRoomAt(8, -1)!.id;
    expect(traffic.goToRoom('a', addedId)).toBe(true);
    expect(traffic.getResident('a')!.remainingCells.at(-1)).toBeDefined();
    expect(layout.remove(addedId).ok).toBe(true);
    expect(traffic.refresh()).toContain('a');
    expect(traffic.getResident('a')!.destinationId).toBeNull();
  });

  it('rejects sky cells, solid ground and duplicate IDs, and walks only on built upper floors', () => {
    const current = new BuildingLayout().snapshot();
    const layout = new BuildingLayout({
      ...current, terrain: { ...current.terrain, highestFloor: 1, elevators: [...current.terrain.elevators!, {x:0,y:1}] }
    }, LEGACY_SURFACE_POLICY);
    expect(layout.place('habitat', 2, 0).ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    expect(isWalkableCell(layout, { x: 2, y: 1 })).toBe(true);
    expect(isWalkableCell(layout, { x: 4, y: 1 })).toBe(false);
    expect(isWalkableCell(layout, { x: -1, y: 0 })).toBe(false);
    expect(isWalkableCell(layout, { x: 5, y: -3 })).toBe(false);
    expect(() => new ResidentTraffic(layout, [{ id: 'a', cell: { x: 4, y: 1 } }])).toThrow();
    expect(() => new ResidentTraffic(layout, [
      { id: 'a', cell: { x: 5, y: -1 } },
      { id: 'a', cell: { x: 5, y: -1 } }
    ])).toThrow();
  });

  it('honors reduced motion by moving one traversable cell at a time', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    traffic.goToRoom('a', 'initial-power');
    traffic.goToRoom('b', 'initial-habitat');
    for (let i = 0; i < 200; i++) {
      traffic.advance(16, true);
      assertSafe(layout, traffic);
    }
    expect(traffic.getResident('a')!.isMoving).toBe(false);
    expect(traffic.getResident('b')!.isMoving).toBe(false);
  });
});
