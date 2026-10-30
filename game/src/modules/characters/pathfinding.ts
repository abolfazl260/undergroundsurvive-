import type { BuildingLayout } from '../building/layout';
import { isInsideWorld, toCell, toPixels, type GridPosition } from '../world/grid';

export interface WalkPoint { x: number; y: number }

const directions: readonly GridPosition[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 },
  { x: 0, y: 1 }, { x: 0, y: -1 }
];
const key = ({ x, y }: GridPosition): string => x + ':' + y;

/** Feet of the character stay inside the current grid cell. */
export function walkPoint(cell: GridPosition): WalkPoint {
  const { left, top } = toPixels(cell.x, cell.y);
  return { x: left + 27, y: top + 36 };
}

/**
 * Cells inside rooms and excavated corridors are walkable. In this prototype,
 * a vertical connection is a free (unoccupied) shaft, or the command room's
 * built-in elevator. Other stacked rooms do not form a passage through floors.
 */
export function canWalkBetween(layout: BuildingLayout, from: GridPosition, to: GridPosition): boolean {
  if (!isInsideWorld(from.x, from.y) || !isInsideWorld(to.x, to.y) ||
      Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1 ||
      !layout.terrain.isOpen(from.x, from.y) || !layout.terrain.isOpen(to.x, to.y)) return false;
  if (from.y === to.y) return true;
  const a = layout.getRoomAt(from.x, from.y);
  const b = layout.getRoomAt(to.x, to.y);
  return (!a && !b) || a?.type === 'command' || b?.type === 'command';
}

/** Breadth-first search finds the shortest traversable path to any cell of a room. */
export function findRoomPath(
  layout: BuildingLayout, start: GridPosition, roomId: string
): GridPosition[] | null {
  if (!layout.terrain.isOpen(start.x, start.y) ||
      !layout.rooms.some((room) => room.id === roomId)) return null;
  const queue: GridPosition[] = [start];
  const seen = new Set<string>([key(start)]);
  const previous = new Map<string, string>();
  const cells = new Map<string, GridPosition>([[key(start), start]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (layout.getRoomAt(current.x, current.y)?.id === roomId) {
      const path: GridPosition[] = [];
      let cursor = key(current);
      while (true) {
        path.push(cells.get(cursor)!);
        const parent = previous.get(cursor);
        if (!parent) return path.reverse();
        cursor = parent;
      }
    }
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = key(next);
      if (seen.has(nextKey) || !canWalkBetween(layout, current, next)) continue;
      seen.add(nextKey);
      previous.set(nextKey, key(current));
      cells.set(nextKey, next);
      queue.push(next);
    }
  }
  return null;
}

/** Animation-free navigation model, kept separate from Phaser for unit testing. */
export class ResidentNavigator {
  private positionValue: WalkPoint;
  private path: GridPosition[] = [];
  private nextIndex = 0;
  private targetId: string | null = null;

  constructor(private readonly layout: BuildingLayout, start: GridPosition, private readonly speed = 88) {
    this.positionValue = walkPoint(start);
  }

  get position(): WalkPoint { return { ...this.positionValue }; }
  get destinationId(): string | null { return this.targetId; }
  get isMoving(): boolean { return this.nextIndex < this.path.length; }
  get remainingCells(): readonly GridPosition[] { return this.path.slice(this.nextIndex); }

  currentCell(): GridPosition | null {
    return toCell(this.positionValue.x, this.positionValue.y);
  }

  goToRoom(roomId: string): boolean {
    const cell = this.currentCell();
    const path = cell ? findRoomPath(this.layout, cell, roomId) : null;
    if (!path) return false; // Preserve a valid previous target on a bad command.
    this.path = path;
    this.nextIndex = 1;
    this.targetId = roomId;
    return true;
  }

  /** Returns true only on the frame in which the character arrives. */
  advance(deltaMs: number): boolean {
    const wasMoving = this.isMoving;
    let distanceLeft = Math.max(0, Math.min(deltaMs, 1000)) * this.speed / 1000;
    while (this.isMoving && distanceLeft > 0) {
      const destination = walkPoint(this.path[this.nextIndex]);
      const dx = destination.x - this.positionValue.x;
      const dy = destination.y - this.positionValue.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= distanceLeft) {
        this.positionValue = destination;
        this.nextIndex++;
        distanceLeft -= distance;
      } else {
        this.positionValue = {
          x: this.positionValue.x + dx / distance * distanceLeft,
          y: this.positionValue.y + dy / distance * distanceLeft
        };
        distanceLeft = 0;
      }
    }
    return wasMoving && !this.isMoving;
  }

  /** Respect reduced-motion preferences without bypassing reachability. */
  finishImmediately(): void {
    if (!this.isMoving) return;
    this.positionValue = walkPoint(this.path[this.path.length - 1]);
    this.nextIndex = this.path.length;
  }

  /** Replan after construction, demolition, excavation or relocation. */
  refresh(): boolean {
    if (!this.targetId) return true;
    if (this.goToRoom(this.targetId)) return true;
    this.cancel();
    return false;
  }

  cancel(): void {
    this.path = [];
    this.nextIndex = 0;
    this.targetId = null;
  }
}
