import { describe, expect, it } from 'vitest';
import { backingSize, MAX_BACKING_PIXELS, selectRenderDensity } from './renderQuality';

describe('high-density rendering', () => {
  it('renders at 2x on a typical mobile retina viewport', () => {
    const density = selectRenderDensity(3, 390, 844);
    expect(density).toBe(2);
    expect(backingSize(390, 844, density)).toEqual({ width: 780, height: 1688 });
  });

  it('caps GPU fill rate for large screens and defaults safely', () => {
    expect(selectRenderDensity(2, 1920, 1080)).toBe(1.25);
    expect(selectRenderDensity(1, 1920, 1080)).toBe(1);
    expect(selectRenderDensity(NaN, 390, 844)).toBe(1);
    expect(selectRenderDensity(3, 0, 844)).toBe(1);
    const density = selectRenderDensity(3, 1000, 1600);
    const backing = backingSize(1000, 1600, density);
    expect(backing.width * backing.height).toBeLessThanOrEqual(MAX_BACKING_PIXELS);
  });
});
