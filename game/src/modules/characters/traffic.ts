import type { BuildingLayout } from '../building/layout';
import { type GridPosition } from '../world/grid';
import { canWalkBetween, findRoomPath, isWalkableCell, walkPoint, type WalkPoint } from './pathfinding';

export interface ResidentSpawn { id: string; cell: GridPosition }

/** One physical cabin serves each connected shaft; visual phases never grant
 * new traversable edges. A passenger reserves both cells until the doors close
 * at the destination, so two residents cannot cross through one another. */
export type ElevatorPhase = 'calling' | 'opening' | 'boarding' | 'closing' |
  'travel' | 'arrival-opening' | 'exiting';
export interface ElevatorRide {
  from: GridPosition;
  to: GridPosition;
  phase: ElevatorPhase;
  elapsedMs: number;
  callFromY: number;
}
export interface ElevatorCarView {
  x: number;
  y: number;
  doorOpen: number;
  passengerId: string | null;
  phase: ElevatorPhase | 'idle';
}
const ELEVATOR_MS: Readonly<Record<ElevatorPhase, number>> = {
  calling: 700, opening: 280, boarding: 320, closing: 230,
  travel: 950, 'arrival-opening': 280, exiting: 320
};
const ridePhases: readonly ElevatorPhase[] =
  ['calling', 'opening', 'boarding', 'closing', 'travel', 'arrival-opening', 'exiting'];
export interface ResidentView {
  id: string;
  position: WalkPoint;
  cell: GridPosition;
  destinationId: string | null;
  isMoving: boolean;
  isWalking: boolean;
  isWaiting: boolean;
  remainingCells: readonly GridPosition[];
  elevator: ElevatorPhase | null;
}

export interface ResidentState {
  id: string;
  cell: GridPosition; // Last fully occupied cell; held until the next cell is reached.
  position: WalkPoint;
  next: GridPosition | null; // A reserved destination while crossing a cell boundary.
  route: GridPosition[]; // Subsequent steps, excluding the in-progress segment.
  destinationId: string | null;
  waiting: boolean;
  elevator?: ElevatorRide | null;
  targetCell?:GridPosition|null;
}

const key = (p: GridPosition): string => p.x + ':' + p.y;

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
  /** Last parked position per physical shaft. */
  private readonly carFloors = new Map<number, number>();

  constructor(
    private layout: BuildingLayout,
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
        route: [], destinationId: null, waiting: false, elevator: null
      };
    });
  }

  get residents(): readonly ResidentView[] {
    return this.agents.map((agent) => this.view(agent));
  }

  /** Read-only animation positions, including a travelling and opening cabin. */
  get elevatorCars(): readonly ElevatorCarView[] {
    const columns = [...new Set(this.layout.terrain.elevators.map((shaft) => shaft.x))];
    return columns.map((x) => {
      const passenger = this.agents.find((agent) => agent.elevator?.from.x === x);
      const ride = passenger?.elevator;
      if (!ride) {
        const parked = this.carFloors.get(x);
        const initial = this.layout.terrain.isElevator(x, -1) ? -1 :
          this.layout.terrain.elevators.find((cell) => cell.x === x)?.y ?? 0;
        return { x, y: parked ?? initial, doorOpen: 0, passengerId: null, phase: 'idle' };
      }
      const duration = ELEVATOR_MS[ride.phase] *
        (ride.phase === 'calling' ? Math.abs(ride.from.y - ride.callFromY) : 1);
      const t = Math.min(1, ride.elapsedMs / Math.max(1, duration));
      const y = ride.phase === 'calling'
        ? ride.callFromY + (ride.from.y - ride.callFromY) * t
        : ride.phase === 'travel'
          ? ride.from.y + (ride.to.y - ride.from.y) * t
          : (ride.phase === 'arrival-opening' || ride.phase === 'exiting' ? ride.to.y : ride.from.y);
      const doorOpen = ride.phase === 'opening' || ride.phase === 'arrival-opening' ? t :
        ride.phase === 'boarding' ? 1 : ride.phase === 'exiting' ? 1 - t :
        ride.phase === 'closing' ? 1 - t : 0;
      return { x, y, doorOpen, passengerId: passenger!.id, phase: ride.phase };
    });
  }

  getResident(id: string): ResidentView | undefined {
    const agent = this.agents.find((item) => item.id === id);
    return agent ? this.view(agent) : undefined;
  }

  private view(agent: ResidentState): ResidentView {
    const room = agent.destinationId
      ? this.layout.rooms.find((r) => r.id === agent.destinationId)
      : undefined;
    const inRoom = room?.id === this.layout.getRoomAt(agent.cell.x, agent.cell.y)?.id && !agent.next && (!agent.targetCell||key(agent.cell)===key(agent.targetCell));
    return {
      id: agent.id, cell: { ...agent.cell }, position: { ...agent.position },
      destinationId: agent.destinationId,
      isMoving: agent.next !== null || (!!agent.destinationId && !inRoom),
      isWalking: agent.next !== null,
      isWaiting: agent.waiting,
      elevator: agent.elevator?.phase ?? null,
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
    const room=this.layout.rooms.find(r=>r.id===roomId);if(!room)return false;
    // Settle deeper inside a room so later arrivals can use its doorway cell.
    const reserved=new Set(this.agents.filter(a=>a!==agent).flatMap(a=>[...(a.targetCell?[key(a.targetCell)]:[])]));
    const goals=Array.from({length:room.width},(_,i)=>({x:room.x+i,y:room.y}))
      .filter(cell=>!reserved.has(key(cell)))
      .sort((a,b)=>Math.abs(b.x-anchor.x)-Math.abs(a.x-anchor.x));
    let path:GridPosition[]|null=null,goal:GridPosition|undefined;
    for(const candidate of goals) {path=findRoomPath(this.layout,anchor,roomId,new Set(),candidate);if(path){goal=candidate;break;}}
    if (!path||!goal) return false;
    agent.targetCell=goal;
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
    agent.targetCell=null;
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

  /** Advance a lift as a staged, cancellable state machine. Normal walker
   * interpolation must never run on the vertical edge. */
  private advanceRide(agent: ResidentState, deltaMs: number, reducedMotion: boolean): boolean {
    const ride = agent.elevator!;
    const duration = ELEVATOR_MS[ride.phase] *
      (ride.phase === 'calling' ? Math.abs(ride.from.y - ride.callFromY) : 1);
    ride.elapsedMs += reducedMotion ? Math.max(1, duration) : deltaMs;
    const t = Math.min(1, ride.elapsedMs / Math.max(1, duration));
    if (ride.phase === 'travel') {
      const start = walkPoint(ride.from), end = walkPoint(ride.to);
      agent.position = { x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t };
    }
    if (ride.elapsedMs + 0.0001 < duration) return false;
    const next: Readonly<Partial<Record<ElevatorPhase, ElevatorPhase>>> = {
      calling: 'opening', opening: 'boarding', boarding: 'closing',
      closing: 'travel', travel: 'arrival-opening', 'arrival-opening': 'exiting'
    };
    const phase = next[ride.phase];
    if (phase) {
      ride.phase = phase;
      ride.elapsedMs = 0;
      if (phase === 'arrival-opening') agent.position = walkPoint(ride.to);
      return false;
    }
    // Exiting complete: restore normal room navigation with one reserved edge
    // consumed exactly once and the cabin parked on the arrival floor.
    this.carFloors.set(ride.from.x, ride.to.y);
    agent.cell = { ...ride.to };
    agent.position = walkPoint(ride.to);
    agent.next = null;
    agent.elevator = null;
    agent.waiting = false;
    return true;
  }

  private reached(agent: ResidentState): boolean {
    return !!agent.destinationId && agent.next === null &&
      this.layout.getRoomAt(agent.cell.x, agent.cell.y)?.id === agent.destinationId &&
      (!agent.targetCell||key(agent.cell)===key(agent.targetCell));
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
        agent.elevator = null;
        agent.route = [];
        continue;
      }
      if (agent.elevator) {
        if (this.advanceRide(agent, Math.max(0, Math.min(deltaMs, 1000)), reducedMotion) && this.reached(agent)) {
          agent.route = [];
          arrivals.push(agent.id);
        }
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
        const path = findRoomPath(this.layout, anchor, target,new Set(),agent.targetCell??undefined);
        if (!path) {
          this.cancel(agent.id);
          continue;
        }
        agent.route = path.slice(1);
      }
      const blocked = this.heldCells(agent.id);
      if (agent.route[0] && blocked.has(key(agent.route[0]))) {
        const alternative = findRoomPath(this.layout, anchor, target, blocked,agent.targetCell??undefined);
        if (alternative) agent.route = alternative.slice(1);
      }
      const next = agent.route[0];
      if (!next || blocked.has(key(next)) || !canWalkBetween(this.layout, anchor, next)) {
        agent.waiting = true;
        continue;
      }
      const isLift = next.y !== anchor.y;
      if (isLift && this.agents.some((other) => other.id !== agent.id &&
          other.elevator?.from.x === anchor.x)) {
        agent.waiting = true;
        continue;
      }
      agent.waiting = false;
      agent.next = { ...next };
      agent.route.shift();
      if (isLift) {
        const car = this.carFloors.get(anchor.x) ??
          (this.layout.terrain.isElevator(anchor.x, -1) ? -1 : anchor.y);
        agent.elevator = { from: { ...anchor }, to: { ...next },
          callFromY: car, phase: car === anchor.y ? 'opening' : 'calling', elapsedMs: 0 };
      }
    }
    if (count) this.priority = (this.priority + 1) % count;
    return arrivals;
  }

  snapshot(): {schemaVersion:1; agents:ResidentState[]; priority:number; cars?: {x:number;y:number}[]} {
    return {schemaVersion:1,agents:structuredClone(this.agents),priority:this.priority,
      cars: [...this.carFloors].map(([x,y]) => ({x,y}))};
  }

  setLayout(layout: BuildingLayout): void { this.layout = layout; this.refresh(); }

  static restore(layout:BuildingLayout, raw:unknown):ResidentTraffic|null {
    if(!raw || typeof raw!=='object') return null;
    const s=raw as ReturnType<ResidentTraffic['snapshot']>;
    if(s.schemaVersion!==1 || !Array.isArray(s.agents) || s.agents.length>100 ||
      !Number.isSafeInteger(s.priority) || s.priority<0 || s.priority>=Math.max(1,s.agents.length)) return null;
    if(s.cars !== undefined && (!Array.isArray(s.cars) || s.cars.length>14 ||
      new Set(s.cars.map(car=>car?.x)).size!==s.cars.length ||
      !s.cars.every(car=>car && layout.terrain.isElevator(car.x,car.y)))) return null;
    const held=new Set<string>(), ids=new Set<string>();
    for(const a of s.agents) {
      if(!a || typeof a.id!=='string' || !a.id || ids.has(a.id) || !a.cell || !isWalkableCell(layout,a.cell) ||
        !a.position || !Number.isFinite(a.position.x) || !Number.isFinite(a.position.y) ||
        (a.destinationId!==null && typeof a.destinationId!=='string') || typeof a.waiting!=='boolean' ||
        !Array.isArray(a.route) || a.route.length>100) return null;
      if(a.targetCell && (!isWalkableCell(layout,a.targetCell)||layout.getRoomAt(a.targetCell.x,a.targetCell.y)?.id!==a.destinationId))return null;
      ids.add(a.id);
      if(a.elevator) {
        const ride=a.elevator;
        if(!a.next || a.next.x!==a.cell.x || Math.abs(a.next.y-a.cell.y)!==1 ||
          ride.from.x!==a.cell.x || ride.from.y!==a.cell.y ||
          ride.to.x!==a.next.x || ride.to.y!==a.next.y ||
          !ridePhases.includes(ride.phase) || !Number.isFinite(ride.elapsedMs) ||
          ride.elapsedMs<0 || !layout.terrain.isElevator(ride.from.x,ride.callFromY) ||
          s.agents.filter(agent=>agent?.elevator?.from.x===ride.from.x).length!==1) return null;
      }
      const start=walkPoint(a.cell), end=a.next?walkPoint(a.next):start;
      if(a.next && !canWalkBetween(layout,a.cell,a.next)) return null;
      const dx=end.x-start.x,dy=end.y-start.y;
      const t=Math.abs(dx)>0?(a.position.x-start.x)/dx:Math.abs(dy)>0?(a.position.y-start.y)/dy:0;
      if(t<0||t>1 || Math.abs(a.position.x-(start.x+dx*t))>0.01 || Math.abs(a.position.y-(start.y+dy*t))>0.01) return null;
      for(const cell of [a.cell,...(a.next?[a.next]:[])]) {if(held.has(key(cell))) return null;held.add(key(cell));}
      let previous=a.next??a.cell;
      for(const cell of a.route) {if(!cell || !canWalkBetween(layout,previous,cell))return null;previous=cell;}
    }
    const traffic=new ResidentTraffic(layout,s.agents.map(a=>({id:a.id,cell:a.cell})));
    traffic.agents.splice(0,traffic.agents.length,...structuredClone(s.agents));traffic.priority=s.priority;
    for(const car of s.cars ?? []) traffic.carFloors.set(car.x,car.y);
    traffic.refresh();return traffic;
  }

  /** Recheck assignments after build, move, demolition, excavation or floor changes. */
  refresh(): string[] {
    const cancelled: string[] = [];
    for (const agent of this.agents) {
      if (agent.next && !canWalkBetween(this.layout, agent.cell, agent.next)) {
        agent.next = null;
        agent.elevator = null;
        agent.position = walkPoint(agent.cell);
      }
      if (!agent.destinationId) continue;
      const anchor = agent.next ?? agent.cell;
      if(agent.targetCell&&this.layout.getRoomAt(agent.targetCell.x,agent.targetCell.y)?.id!==agent.destinationId) {
        if(this.goToRoom(agent.id,agent.destinationId))continue;
        cancelled.push(agent.id);this.cancel(agent.id);continue;
      }
      const path = findRoomPath(this.layout, anchor, agent.destinationId,new Set(),agent.targetCell??undefined);
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
