import { describe, expect, it } from 'vitest';
import { hitSurvivor, survivorFrame, survivorGeometry } from './survivorArt';
describe('survivor art geometry', () => {
  it('fits useful interior at foot origin and preserves proportions', () => {
    const g = survivorGeometry();
    expect(g.height / 31).toBeCloseTo(0.56);
    expect(36 + g.feetOffset).toBe(44);
    expect(44 - g.height).toBeGreaterThan(13);
    expect(g.width / g.height).toBeCloseTo(128 / 192);
  });
  it('keeps touch bounds independent of alpha and zoom', () => {
    for (const zoom of [1, 2.25]) {
      expect(hitSurvivor({x:100,y:100}, {x:100,y:96}, zoom)).toBe(true);
      expect(hitSurvivor({x:100,y:100}, {x:150,y:96}, zoom)).toBe(false);
    }
  });
  it('selects variant and state frames with static reduced motion', () => {
    expect(survivorFrame(2,'work',0)).toBe(16);
    expect(survivorFrame(2,'work',501)).toBe(17);
    expect(survivorFrame(1,'walk',160,true)).toBe(8);
    expect(survivorFrame(0,'idle',501)).toBe(1);
  });
});
