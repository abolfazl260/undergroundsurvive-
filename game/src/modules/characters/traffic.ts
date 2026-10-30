import type { BuildingLayout } from '../building/layout';
import { type GridPosition } from '../world/grid';
import { canWalkBetween, findRoomPath, isWalkableCell, walkPoint, type WalkPoint } from './pathfinding';

export interface ResidentSpawn { id: string; cell: GridPosition }
export interface ResidentView {
  id: string;
  position: WalkPoint;
  cell: GridPosition;
  destinationId: string | null;
  isMoving: boolean;
  isWalking: boolean;
  isWaiting: boolean;
  remainingCells: readonly GridPosition[];
}

interface ResidentState {
  id: string;
  cell: GridPosition; // Last fully occupied cell; held until the next cell is reached.
  position: WalkPoint;
  next: GridPosition | null; // A reserved destination while crossing a cell boundary.
  route: GridPosition[]; // Subsequent steps, excluding the in-progress segment.
  destinationId: string | null;
  waiting: boolean;
}

const key = (p: GridPosition): string => p.x + ':' + p.y;
const same = (a: GridPosition, b: GridPosition): boolean => a.x === b.x && a.y === b.y;

/**
 * Deterministic multi-resident movement. A walking resident reserves BOTH its
 * source and destination cells. No other resident can enter either cell, and
 * opposing residents can never swap through each other on a single frame.
 *
 * Traffic is intentionally not serialized. Agents on disjoint routes move in
 * parallel; a blocked agent tries a new route before waiting for clearance.
 */
export class ResidentTraffic {
  private readonly agents: ResidentState[];
  private priority = 0;

  constructor(
    private readonly layout: BuildingLayout,
    spawns: readonly ResidentSpawn[],
    private readonly speed = 88
  ) {
    if (!Number.isFinite(speed) || speed <= 0) throw new Error('Invalid resident speed');
    const ids = new Set<string>();
    const cells = new Set<string>();
    this.agents = spawns.map(({ id, cell }) => {
      if (!id || ids.has(id) || !isWalkableCell(layout, cell) || cells.has(key(cell)))
        throw new Error('Invalid or overlapping resident spawn');
      ids.add(id);
      cells.add(key(cell));
      return {
        id, cell: { ...cell }, position: walkPoint(cell), next: null,
        route: [], destinationId: null, waiting: false
      };
    });
  }

  get residents(): readonly ResidentView[] {
    return this.agents.map((agent) => this.view(agent));
  }

  getResident(id: string): ResidentView | undefined {
    const agent = this.agents.find((item) => item.id === id);
    return agent ? this.view(agent) : undefined;
  }

  private view(agent: ResidentState): ResidentView {
    const room = agent.destinationId && this.layout.rooms.find((r) => r.id === agent.destinationId);
    const inRoom = room?.id === this.layout.getRoomAt(agent.cell.x, agent.cell.y)?.id && !agent.next;
    return {
      id: agent.id, cell: { ...agent.cell }, position: { ...agent.position },
      destinationId: agent.destinationId,
      isMoving: agent.next !== null || (!!agent.destinationId && !inRoom),
      isWalking: agent.next !== null,
      isWaiting: agent.waiting,
      remainingCells: [
        ...(agent.next ? [{ ...agent.next }] : []),
        ...agent.route.map((cell) => ({ ...cell }))
      ]
    };
  }

  /** Invalid commands leave the previous valid assignment untouched. */
  goToRoom(id: string, roomId: string): boolean {
    const agent = this.agents.find((item) => item.id === id);
    if (!agent) return false;
    const anchor = agent.next ?? agent.cell;
    const path = findRoomPath(this.layout, anchor, roomId);
    if (!path) return false;
    agent.destinationId = roomId;
    agent.route = path.slice(1);
    agent.waiting = false;
    return true;
  }

  cancel(id: string): void {
    const agent = this.agents.find((item) => item.id === id);
    if (!agent) return;
    // Finish an already reserved segment safely rather than teleporting home.
    agent.destinationId = null;
    agent.route = [];
    agent.waiting = false;
  }

  private heldCells(exceptId: string): Set<string> {
    const held = new Set<string>();
    for (const agent of this.agents) {
      if (agent.id === exceptId) continue;
      held.add(key(agent.cell));
      if (agent.next) held.add(key(agent.next));
    }
    return held;
  }

  private reached(agent: ResidentState): boolean {
    return !!agent.destinationId && agent.next === null &&
      this.layout.getRoomAt(agent.cell.x, agent.cell.y)?.id === agent.destinationId;
  }

  /**
   * Progress existing segments first, then allocate the next vacant segments.
   * At most one new edge can be allocated per agent per frame, preventing a
   * large frame delta from tunneling through obstacles or other residents.
   */
  advance(deltaMs: number, reducedMotion = false): string[] {
    const arrivals: string[] = [];
    const distance = Math.max(0, Math.min(Number.isFinite(deltaMs) ? deltaMs : 0, 1000)) *
      this.speed / 1000;
    if (!reducedMotion && distance === 0) return arrivals;

    for (const agent of this.agents) {
      if (!agent.next) continue;
      if (!canWalkBetween(this.layout, agent.cell, agent.next)) {
        // A changed layout invalidated the edge; retreat to its last safe cell.
        agent.position = walkPoint(agent.cell);
        agent.next = null;
        agent.route = [];
        continue;
      }
      const destination = walkPoint(agent.next);
      const dx = destination.x - agent.position.x;
      const dy = destination.y - agent.position.y;
      const remaining = Math.hypot(dx, dy);
      if (reducedMotion || remaining <= distance) {
        agent.cell = agent.next;
        agent.position = destination;
        agent.next = null;
        agent.waiting = false;
        if (this.reached(agent)) {
          agent.route = [];
          arrivals.push(agent.id);
        }
      } else {
        agent.position = {
          x: agent.position.x + dx * distance / remaining,
          y: agent.position.y + dy * distance / remaining
        };
      }
    }

    // Rotate scheduling priority so the same resident does not always win a
    // contested corridor. Reservations are visible immediately to later agents.
    const count = this.agents.length;
    for (let i = 0; i < count; i++) {
      const agent = this.agents[(this.priority + i) % count];
      if (!agent.destinationId || agent.next) continue;
      if (this.reached(agent)) {
        agent.waiting = false;
        agent.route = [];
        continue;
      }
      const anchor = agent.cell;
      const target = agent.destinationId;
      if (!agent.route.length || !canWalkBetween(this.layout, anchor, agent.route[0])) {
        const path = findRoomPath(this.layout, anchor, target);
        if (!path) {
          this.cancel(agent.id);
          continue;
        }
        agent.route = path.slice(1);
      }
      const blocked = this.heldCells(agent.id);
      if (agent.route[0] && blocked.has(key(agent.route[0]))) {
        const alternative = findRoomPath(this.layout, anchor, target, blocked);
        if (alternative) agent.route = alternative.slice(1);
      }
      const next = agent.route[0];
      if (!next || blocked.has(key(next)) || !canWalkBetween(this.layout, anchor, next)) {
        agent.waiting = true;
        continue;
      }
      agent.waiting = false;
      agent.next = { ...next };
      agent.route.shift();
    }
    if (count) this.priority = (this.priority + 1) % count;
    return arrivals;
  }

  /** Recheck assignments after build, move, demolition, excavation or floor changes. */
  refresh(): string[] {
    const cancelled: string[] = [];
    for (const agent of this.agents) {
      if (agent.next && !canWalkBetween(this.layout, agent.cell, agent.next)) {
        agent.next = null;
        agent.position = walkPoint(agent.cell);
      }
      if (!agent.destinationId) continue;
      const anchor = agent.next ?? agent.cell;
      const path = findRoomPath(this.layout, anchor, agent.destinationId);
      if (!path) {
        cancelled.push(agent.id);
        this.cancel(agent.id);
      } else {
        agent.route = path.slice(1);
        agent.waiting = false;
      }
    }
    return cancelled;
  }
}
