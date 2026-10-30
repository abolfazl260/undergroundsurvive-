import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { LAB_WATER_ART_ASSET, LAB_WATER_FRAME_BY_TYPE, LEVEL_TWO_ROOM_ART_ASSET, LEVEL_TWO_FRAME_BY_TYPE, roomArtCandidates } from './roomArt';
it('registers distinct laboratory and water art with bundled HD and fallback files', () => {
  expect(LAB_WATER_FRAME_BY_TYPE).toEqual({laboratory:0,waterTreatment:1});
  for (const variant of LAB_WATER_ART_ASSET.variants) expect(existsSync('public/' + variant.path)).toBe(true);
});
it('removes floor labels while keeping terrain rendering', () => {
  const scene = readFileSync('src/app/GameScene.ts','utf8');
  expect(scene).not.toContain('drawLevelMarkers');
  expect(scene).toContain('private paintTerrain');
});

it('maps exactly five level-two rooms to five distinct approved art frames', () => {
  expect(LEVEL_TWO_FRAME_BY_TYPE).toEqual({
    generator: 0, waterTreatment: 1, kitchen: 2, medbay: 3, laboratory: 4
  });
  expect(new Set(Object.values(LEVEL_TWO_FRAME_BY_TYPE)).size).toBe(5);
  expect(LEVEL_TWO_ROOM_ART_ASSET.kind).toBe('spritesheet');
  expect(LEVEL_TWO_ROOM_ART_ASSET.frameWidth).toBe(400);
  expect(LEVEL_TWO_ROOM_ART_ASSET.frameHeight).toBe(132);
  for (const variant of LEVEL_TWO_ROOM_ART_ASSET.variants) {
    const file = 'public/' + variant.path;
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(bytes.length).toBeLessThan(120_000);
  }
});
it('preserves level-one art, upgrades level two, and falls back on failed loads', () => {
  expect(roomArtCandidates('generator', 1)).toEqual([{ key: 'room-art', frame: 4 }]);
  expect(roomArtCandidates('generator', 2)).toEqual([
    { key: 'level-two-room-art', frame: 0 }, { key: 'room-art', frame: 4 }
  ]);
  expect(roomArtCandidates('waterTreatment', 1)).toEqual([{ key: 'lab-water-art', frame: 1 }]);
  expect(roomArtCandidates('medbay', 2)).toEqual([
    { key: 'level-two-room-art', frame: 3 }, { key: 'garden-medbay-art', frame: 1 }
  ]);
  expect(roomArtCandidates('kitchen', 1)).toEqual([]);
  expect(roomArtCandidates('kitchen', 2)).toEqual([{ key: 'level-two-room-art', frame: 2 }]);
  expect(roomArtCandidates('laboratory', 3)[0]).toEqual({ key: 'level-two-room-art', frame: 4 });
  expect(roomArtCandidates('mine', 2)).toEqual([{ key: 'room-art', frame: 5 }]);
});
