import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import { isWalkableCell, walkPoint } from './pathfinding';
import { ResidentTraffic } from './traffic';
import type { GridPosition } from '../world/grid';

const key = (cell: GridPosition): string => cell.x + ':' + cell.y;
const starter = [
  { id: 'a', cell: { x: 5, y: -1 } },
  { id: 'b', cell: { x: 6, y: -1 } },
  { id: 'c', cell: { x: 7, y: -1 } }
];

function assertSafe(layout: BuildingLayout, traffic: ResidentTraffic): void {
  const held = new Set<string>();
  for (const resident of traffic.residents) {
    expect(isWalkableCell(layout, resident.cell)).toBe(true);
    const footprint = [resident.cell, ...(resident.isWalking ? resident.remainingCells.slice(0, 1) : [])];
    for (const cell of footprint) {
      expect(isWalkableCell(layout, cell)).toBe(true);
      expect(held.has(key(cell))).toBe(false);
      held.add(key(cell));
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

describe('multi-resident physical navigation', () => {
  it('reserves source and destination cells for three concurrent residents', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    expect(traffic.goToRoom('a', 'initial-power')).toBe(true);
    expect(traffic.goToRoom('b', 'initial-habitat')).toBe(true);
    expect(traffic.goToRoom('c', 'initial-garden')).toBe(true);
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

  it('reroutes around a stationary resident instead of walking into them', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter.slice(0, 2));
    expect(traffic.goToRoom('a', 'initial-habitat')).toBe(true);
    traffic.advance(100);
    const moving = traffic.getResident('a')!;
    expect(moving.remainingCells[0]).toEqual({ x: 5, y: 0 });
    expect(moving.isWaiting).toBe(false);
    for (let i = 0; i < 240; i++) {
      traffic.advance(100);
      assertSafe(layout, traffic);
    }
    expect(layout.getRoomAt(traffic.getResident('a')!.cell.x, traffic.getResident('a')!.cell.y)?.id)
      .toBe('initial-habitat');
  });

  it('does not tunnel through or swap with another resident even under huge frame delays', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    traffic.goToRoom('a', 'initial-habitat');
    traffic.goToRoom('c', 'initial-power');
    for (let i = 0; i < 150; i++) {
      traffic.advance(30_000);
      assertSafe(layout, traffic);
    }
  });

  it('keeps valid goals, rejects invalid retargeting, and cancels removed rooms', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    expect(traffic.goToRoom('a', 'initial-garden')).toBe(true);
    expect(traffic.goToRoom('a', 'absent')).toBe(false);
    expect(traffic.getResident('a')!.destinationId).toBe('initial-garden');
    expect(layout.move('initial-garden', 8, 0).ok).toBe(true);
    expect(traffic.refresh()).toEqual([]);
    expect(traffic.getResident('a')!.remainingCells.at(-1)).toBeDefined();
    expect(layout.remove('initial-garden').ok).toBe(true);
    expect(traffic.refresh()).toContain('a');
    expect(traffic.getResident('a')!.destinationId).toBeNull();
  });

  it('rejects sky cells, solid ground, duplicate spawns, and walks only on built upper floors', () => {
    const layout = new BuildingLayout();
    expect(layout.unlockFloor().ok).toBe(true);
    expect(layout.place('habitat', 2, 1).ok).toBe(true);
    expect(isWalkableCell(layout, { x: 2, y: 1 })).toBe(true);
    expect(isWalkableCell(layout, { x: 4, y: 1 })).toBe(false);
    expect(isWalkableCell(layout, { x: -1, y: 0 })).toBe(false);
    expect(isWalkableCell(layout, { x: 5, y: -3 })).toBe(false);
    expect(() => new ResidentTraffic(layout, [{ id: 'a', cell: { x: 4, y: 1 } }])).toThrow();
    expect(() => new ResidentTraffic(layout, [
      { id: 'a', cell: { x: 5, y: -1 } },
      { id: 'b', cell: { x: 5, y: -1 } }
    ])).toThrow();
  });

  it('honors reduced motion by moving one reserved cell at a time', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout, starter);
    traffic.goToRoom('a', 'initial-habitat');
    traffic.goToRoom('b', 'initial-power');
    for (let i = 0; i < 200; i++) {
      traffic.advance(16, true);
      assertSafe(layout, traffic);
    }
    expect(traffic.getResident('a')!.isMoving).toBe(false);
    expect(traffic.getResident('b')!.isMoving).toBe(false);
  });
});
