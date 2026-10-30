import { isInsideWorld, WORLD, type GridPosition } from './grid';

export type TerrainResult = { ok: true } | { ok: false; reason: string };
export interface TerrainSnapshot { highestFloor: number; excavated: GridPosition[] }
const key = (x: number, y: number): string => x + ':' + y;

function starterCells(): GridPosition[] {
  return [
    ...Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: -1 })),
    ...[1, 2, 3, 9, 10, 11, 12].map((x) => ({ x, y: -2 }))
  ];
}

export class TerrainMap {
  private dug: Set<string>;
  private topFloor: number;

  constructor(snapshot?: TerrainSnapshot) {
    this.dug = new Set((snapshot?.excavated ?? starterCells()).map((p) => key(p.x, p.y)));
    this.topFloor = snapshot?.highestFloor ?? 0;
  }

  get highestFloor(): number { return this.topFloor; }
  get excavatedCount(): number { return this.dug.size; }
  isExcavated(x: number, y: number): boolean {
    return isInsideWorld(x, y) && y < 0 && this.dug.has(key(x, y));
  }
  isOpen(x: number, y: number): boolean {
    if (!isInsideWorld(x, y)) return false;
    return y === 0 || (y > 0 && y <= this.topFloor) || (y < 0 && this.isExcavated(x, y));
  }
  canDig(x: number, y: number): TerrainResult {
    if (!isInsideWorld(x, y) || y >= 0)
      return { ok: false, reason: 'حفاری فقط در محدودهٔ زیرزمین مجاز است.' };
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
    return { highestFloor: this.topFloor, excavated };
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
    return new TerrainMap({ highestFloor: data.highestFloor!, excavated: data.excavated });
  }
}

