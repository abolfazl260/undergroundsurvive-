import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { LAB_WATER_ART_ASSET, LAB_WATER_FRAME_BY_TYPE } from './roomArt';
it('registers distinct laboratory and water art with bundled HD and fallback files', () => {
  expect(LAB_WATER_FRAME_BY_TYPE).toEqual({laboratory:0,waterTreatment:1});
  for (const variant of LAB_WATER_ART_ASSET.variants) expect(existsSync('public/' + variant.path)).toBe(true);
});
it('removes floor labels while keeping terrain rendering', () => {
  const scene = readFileSync('src/app/GameScene.ts','utf8');
  expect(scene).not.toContain('drawLevelMarkers');
  expect(scene).toContain('private paintTerrain');
});
