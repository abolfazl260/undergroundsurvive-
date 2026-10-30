import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { LAB_WATER_ART_ASSET, LAB_WATER_FRAME_BY_TYPE, LEVEL_TWO_ROOM_ART_ASSET, LEVEL_TWO_FRAME_BY_TYPE, LEVEL_TWO_ADDITIONAL_ART_ASSET, LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE, LEVEL_TWO_COMMAND_ART_ASSET, roomArtCandidates } from './roomArt';
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
  expect(roomArtCandidates('kitchen', 1)).toEqual([]);
  expect(roomArtCandidates('kitchen', 2)).toEqual([{ key: 'level-two-room-art', frame: 2 }]);
  expect(roomArtCandidates('laboratory', 3)[0]).toEqual({ key: 'level-two-room-art', frame: 4 });
  expect(roomArtCandidates('mine', 2)).toEqual([
    { key: 'level-two-additional-art', frame: 4 }, { key: 'room-art', frame: 5 }
  ]);
});


it('provides distinct Level 2 WebP artwork for every one of the fourteen room types', () => {
  expect(LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE).toEqual({
    habitat: 0, hydroponics: 1, workshop: 2, storage: 3,
    mine: 4, recreation: 5, guardPost: 6, ventilation: 7
  });
  const upgraded = Object.keys(LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE);
  expect(upgraded).toHaveLength(8);
  expect(new Set(Object.values(LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE)).size).toBe(8);
  expect(LEVEL_TWO_ADDITIONAL_ART_ASSET.kind).toBe('spritesheet');
  expect(LEVEL_TWO_COMMAND_ART_ASSET.kind).toBe('spritesheet');
  if (LEVEL_TWO_ADDITIONAL_ART_ASSET.kind !== 'spritesheet' || LEVEL_TWO_COMMAND_ART_ASSET.kind !== 'spritesheet') {
    throw new Error('New artwork must use frames');
  }
  expect(LEVEL_TWO_ADDITIONAL_ART_ASSET.frameWidth).toBe(160);
  expect(LEVEL_TWO_ADDITIONAL_ART_ASSET.frameHeight).toBe(53);
  expect(LEVEL_TWO_COMMAND_ART_ASSET.frameWidth).toBe(240);
  expect(LEVEL_TWO_COMMAND_ART_ASSET.frameHeight).toBe(53);
  expect(LEVEL_TWO_ADDITIONAL_ART_ASSET.variants.map(v => v.scale)).toEqual([1, 2.25]);
  expect(LEVEL_TWO_COMMAND_ART_ASSET.variants.map(v => v.scale)).toEqual([1, 2.25]);
  for (const asset of [LEVEL_TWO_ADDITIONAL_ART_ASSET, LEVEL_TWO_COMMAND_ART_ASSET]) {
    for (const variant of asset.variants) {
      const data = readFileSync('public/' + variant.path);
      expect(data.toString('ascii', 0, 4)).toBe('RIFF');
      expect(data.toString('ascii', 8, 12)).toBe('WEBP');
      expect(data.length).toBeLessThan(160_000);
    }
  }
  const roomTypes = [
    'kitchen', 'recreation', 'guardPost', 'command', 'habitat', 'generator',
    'hydroponics', 'medbay', 'workshop', 'storage', 'mine', 'waterTreatment',
    'laboratory', 'ventilation'
  ] as const;
  const candidates = roomTypes.map(type => roomArtCandidates(type, 2)[0]);
  expect(candidates.every(Boolean)).toBe(true);
  expect(new Set(candidates.map(c => c.key + ':' + c.frame)).size).toBe(roomTypes.length);
  expect(roomArtCandidates('command', 2)[0]).toEqual({key:'level-two-command-art', frame:0});
  expect(roomArtCandidates('ventilation', 2)[0]).toEqual({key:'level-two-additional-art', frame:7});
  expect(roomArtCandidates('command', 1)).toEqual([{key:'room-art',frame:1}]);
  expect(roomArtCandidates('ventilation', 1)).toEqual([]);
});
