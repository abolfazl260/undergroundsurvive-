/** Pure helpers for a sharp canvas without exceeding mobile GPU fill-rate. */
export const MAX_BACKING_PIXELS = 4_000_000;

/** Render at up to 2 physical pixels per CSS pixel, bounded by GPU area. */
export function selectRenderDensity(devicePixelRatio: number, width: number, height: number): number {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0)) return 1;
  const dpr = Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;
  const pixelBudget = Math.sqrt(MAX_BACKING_PIXELS / (width * height));
  return Math.max(1, Math.floor(Math.min(2, dpr, pixelBudget) * 4) / 4);
}

/** Phaser's NONE scale uses physical backing dimensions; CSS stays at 100%. */
export function backingSize(width: number, height: number, density: number) {
  return {
    width: Math.max(1, Math.round(width * density)),
    height: Math.max(1, Math.round(height * density))
  };
}
