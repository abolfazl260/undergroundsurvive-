export const WORLD = {
  cols: 14,
  minY: -4,
  maxY: 2,
  cellSize: 54,
  originX: 102,
  groundLineY: 312
} as const;

/** Two sealed access levels separate the surface blast door from the first buildable underground floor. */
export const SURFACE_ACCESS_BUFFER_FLOORS = 2;
export const SURFACE_ACCESS_BUFFER_HEIGHT = SURFACE_ACCESS_BUFFER_FLOORS * WORLD.cellSize;

export interface GridPosition {
  x: number;
  y: number;
}

export function isInsideWorld(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && x < WORLD.cols && y >= WORLD.minY && y <= WORLD.maxY;
}

export function toPixels(x: number, y: number): { left: number; top: number } {
  // Keep the logical floor IDs and old saves unchanged. The security levels are
  // physical shaft-only space, not player-selectable or buildable grid cells.
  // Fractional y is used for smooth elevator animations across the longer entry shaft.
  const accessOffset = y < 0 ? SURFACE_ACCESS_BUFFER_HEIGHT * Math.min(1, -y) : 0;
  return { left: WORLD.originX + x * WORLD.cellSize,
    top: WORLD.groundLineY - (y + 1) * WORLD.cellSize + accessOffset };
}

export function toCell(pixelX: number, pixelY: number): GridPosition | null {
  const x = Math.floor((pixelX - WORLD.originX) / WORLD.cellSize);
  if (pixelY >= WORLD.groundLineY &&
      pixelY < WORLD.groundLineY + SURFACE_ACCESS_BUFFER_HEIGHT) return null;
  const adjustedY = pixelY >= WORLD.groundLineY + SURFACE_ACCESS_BUFFER_HEIGHT
    ? pixelY - SURFACE_ACCESS_BUFFER_HEIGHT : pixelY;
  const y = Math.ceil((WORLD.groundLineY - adjustedY) / WORLD.cellSize) - 1;
  return isInsideWorld(x, y) ? { x, y } : null;
}

