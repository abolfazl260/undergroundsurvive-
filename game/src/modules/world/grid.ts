export const WORLD = {
  cols: 14,
  minY: -4,
  maxY: 2,
  cellSize: 54,
  originX: 102,
  groundLineY: 312
} as const;

export interface GridPosition {
  x: number;
  y: number;
}

export function isInsideWorld(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && x < WORLD.cols && y >= WORLD.minY && y <= WORLD.maxY;
}

export function toPixels(x: number, y: number): { left: number; top: number } {
  return { left: WORLD.originX + x * WORLD.cellSize, top: WORLD.groundLineY - (y + 1) * WORLD.cellSize };
}

export function toCell(pixelX: number, pixelY: number): GridPosition | null {
  const x = Math.floor((pixelX - WORLD.originX) / WORLD.cellSize);
  const y = Math.floor((WORLD.groundLineY - pixelY) / WORLD.cellSize);
  return isInsideWorld(x, y) ? { x, y } : null;
}

