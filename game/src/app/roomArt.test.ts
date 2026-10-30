import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { LAB_WATER_ART_ASSET, LAB_WATER_FRAME_BY_TYPE, LEVEL_TWO_ROOM_ART_ASSET, LEVEL_TWO_FRAME_BY_TYPE, MISSING_ROOM_ART_ASSET, MISSING_ROOM_FRAME_BY_TYPE, ROOM_FRAME_BY_TYPE, roomArtCandidates } from './roomArt';
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
  if (LEVEL_TWO_ROOM_ART_ASSET.kind !== 'spritesheet') throw new Error('Room art must be a spritesheet');
  expect(LEVEL_TWO_ROOM_ART_ASSET.frameWidth).toBe(160);
  expect(LEVEL_TWO_ROOM_ART_ASSET.frameHeight).toBe(53);
  expect(LEVEL_TWO_ROOM_ART_ASSET.variants.map((v) => v.scale)).toEqual([1, 4]);
  expect(LEVEL_TWO_ROOM_ART_ASSET.variants[1]).toEqual({
    scale: 4, path: 'assets/rooms/room-level-2-hd.webp', frameWidth: 640, frameHeight: 212
  });
  for (const variant of LEVEL_TWO_ROOM_ART_ASSET.variants) {
    const file = 'public/' + variant.path;
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(bytes.length).toBeLessThan(160_000);
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
  expect(roomArtCandidates('kitchen', 1)).toEqual([{ key: 'missing-room-art', frame: 0 }]);
  expect(roomArtCandidates('kitchen', 2)).toEqual([
    { key: 'level-two-room-art', frame: 2 },
    { key: 'missing-room-art', frame: 0 }
  ]);
  expect(roomArtCandidates('laboratory', 3)[0]).toEqual({ key: 'level-two-room-art', frame: 4 });
  expect(roomArtCandidates('mine', 2)).toEqual([{ key: 'room-art', frame: 5 }]);
});

it('renders four previously missing/reused Level 1 room interiors from unique WebP frames', () => {
  expect(MISSING_ROOM_FRAME_BY_TYPE).toEqual({
    kitchen: 0, ventilation: 1, recreation: 2, guardPost: 3
  });
  expect(new Set(Object.values(MISSING_ROOM_FRAME_BY_TYPE)).size).toBe(4);
  // Legacy shared-frame aliases must not come back.
  expect(ROOM_FRAME_BY_TYPE.recreation).toBeUndefined();
  expect(ROOM_FRAME_BY_TYPE.guardPost).toBeUndefined();
  for (const [type, frame] of Object.entries(MISSING_ROOM_FRAME_BY_TYPE)) {
    expect(roomArtCandidates(type as keyof typeof MISSING_ROOM_FRAME_BY_TYPE, 1))
      .toEqual([{ key: MISSING_ROOM_ART_ASSET.key, frame }]);
  }
  expect(roomArtCandidates('kitchen', 2)[0])
    .toEqual({ key: LEVEL_TWO_ROOM_ART_ASSET.key, frame: 2 });
  expect(roomArtCandidates('kitchen', 2)[1])
    .toEqual({ key: MISSING_ROOM_ART_ASSET.key, frame: 0 });
  expect(roomArtCandidates('ventilation', 3)[0])
    .toEqual({ key: MISSING_ROOM_ART_ASSET.key, frame: 1 });
});

it('ships optimized 1x and 3x WebP sprite sheets with correct frame geometry', () => {
  expect(MISSING_ROOM_ART_ASSET.kind).toBe('spritesheet');
  if (MISSING_ROOM_ART_ASSET.kind !== 'spritesheet') throw new Error('Expected spritesheet');
  expect(MISSING_ROOM_ART_ASSET.frameWidth).toBe(160);
  expect(MISSING_ROOM_ART_ASSET.frameHeight).toBe(53);
  expect(MISSING_ROOM_ART_ASSET.variants).toEqual([
    { scale: 1, path: 'assets/rooms/missing-room-atlas.webp' },
    { scale: 3, path: 'assets/rooms/missing-room-atlas-hd.webp', frameWidth: 480, frameHeight: 159 }
  ]);
  for (const variant of MISSING_ROOM_ART_ASSET.variants) {
    const bytes = readFileSync('public/' + variant.path);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(bytes.length).toBeLessThan(40_000);
  }
  const scene = readFileSync('src/app/GameScene.ts', 'utf8');
  expect(scene).toContain('MISSING_ROOM_ART_ASSET');
});
