import { accessibleFloors, validElevators, connectedSegments, type ElevatorSegment } from './elevators';
import { isInsideWorld, WORLD, type GridPosition } from './grid';

export type TerrainResult = { ok: true } | { ok: false; reason: string };
export interface TerrainSnapshot { highestFloor: number; excavated: GridPosition[]; elevators?: ElevatorSegment[] }
const key = (x: number, y: number): string => x + ':' + y;

function starterCells(): GridPosition[] {
  return [
    ...Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: -1 })),
    ...[1, 2, 3, 9, 10, 11, 12].map((x) => ({ x, y: -2 }))
  ];
}

export class TerrainMap {
  private dug: Set<string>;
  private segments: ElevatorSegment[];

  constructor(snapshot?: TerrainSnapshot) {
    this.dug = new Set((snapshot?.excavated ?? starterCells()).map((p) => key(p.x, p.y)));
    const low = snapshot ? Math.min(0,...snapshot.excavated.map(p=>p.y)) : -2;
    this.segments = (snapshot?.elevators ?? Array.from({length:(snapshot?.highestFloor ?? 0)-low+1},(_,i)=>({x:0,y:low+i}))).map(p=>({...p}));
    for (const p of this.segments) if(p.y<0) this.dug.add(key(p.x,p.y));
  }

  get highestFloor(): number { return Math.max(0,...accessibleFloors(this.segments)); }
  get elevators(): readonly ElevatorSegment[] { return this.segments.map(p=>({...p})); }
  isFloorAccessible(y: number): boolean { return accessibleFloors(this.segments).has(y); }
  isElevator(x:number,y:number): boolean { return this.segments.some(p=>p.x===x&&p.y===y); }
  canExtendElevator(x:number,y:number): TerrainResult {
    if(!isInsideWorld(x,y)) return {ok:false,reason:'مکان ساخت خارج از نقشه است.'};
    if(this.isElevator(x,y)) return {ok:false,reason:'این خانه آسانسور دارد.'};
    if(y!==0 && !connectedSegments(this.segments).some(p=>p.x===x&&Math.abs(p.y-y)===1))
      return {ok:false,reason:'آسانسور باید به شفت پیوسته متصل باشد.'};
    return {ok:true};
  }
  withElevator(x:number,y:number): TerrainMap | null {
    if(!this.canExtendElevator(x,y).ok) return null;
    return new TerrainMap({...this.snapshot(),elevators:[...this.segments,{x,y}]});
  }
  get excavatedCount(): number { return this.dug.size; }
  isExcavated(x: number, y: number): boolean {
    return isInsideWorld(x, y) && y < 0 && this.dug.has(key(x, y));
  }
  isOpen(x: number, y: number): boolean {
    if (!isInsideWorld(x, y)) return false;
    return this.isFloorAccessible(y) && (y >= 0 || this.isExcavated(x, y));
  }
  canDig(x: number, y: number): TerrainResult {
    if (!isInsideWorld(x, y) || y >= 0)
      return { ok: false, reason: 'حفاری فقط در محدودهٔ زیرزمین مجاز است.' };
    if (!this.isFloorAccessible(y)) return {ok:false,reason:'این طبقه قفل است؛ آسانسور را امتداد دهید.'};
    if (this.isExcavated(x, y))
      return { ok: false, reason: 'این خانه قبلاً حفاری شده است.' };
    const neighbours = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    if (!neighbours.some(([nx, ny]) => this.isOpen(nx, ny)))
      return { ok: false, reason: 'ابتدا خانه‌ای مجاور این محل را حفاری کنید.' };
    return { ok: true };
  }
  dig(x: number, y: number): TerrainResult {
    const result = this.canDig(x, y);
    if (result.ok) this.dug.add(key(x, y));
    return result;
  }
  /** Retained for old callers, but never grants new floors without an elevator. */
  unlockNextFloor(): TerrainResult {
    return { ok: false, reason: 'بازکردن طبقات بالایی فعلاً غیرفعال است؛ توسعهٔ عمودی به آسانسور نیاز دارد.' };
  }
  snapshot(): TerrainSnapshot {
    const excavated = [...this.dug].map((value) => {
      const [x, y] = value.split(':').map(Number);
      return { x, y };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    return { highestFloor: this.highestFloor, elevators: this.elevators.map(p=>({...p})), excavated };
  }
  static restore(input: unknown): TerrainMap | null {
    if (!input || typeof input !== 'object') return null;
    const data = input as Partial<TerrainSnapshot>;
    if (!Number.isInteger(data.highestFloor) || (data.highestFloor ?? -1) < 0 ||
        (data.highestFloor ?? 99) > WORLD.maxY || !Array.isArray(data.excavated) ||
        data.excavated.length > WORLD.cols * -WORLD.minY) return null;
    const keys = new Set<string>();
    for (const cell of data.excavated) {
      if (!cell || !isInsideWorld(cell.x, cell.y) || cell.y >= 0) return null;
      const id = key(cell.x, cell.y);
      if (keys.has(id)) return null;
      keys.add(id);
    }
    if (data.elevators !== undefined) {
      if (!validElevators(data.elevators)) return null;
      const floors = accessibleFloors(data.elevators);
      if (Math.max(0,...floors) !== data.highestFloor || data.excavated.some(p=>!floors.has(p.y)) ||
          data.elevators.some(p=>p.y<0&&!keys.has(key(p.x,p.y)))) return null;
    }
    return new TerrainMap({ highestFloor: data.highestFloor!, excavated: data.excavated, elevators:data.elevators });
  }
}

