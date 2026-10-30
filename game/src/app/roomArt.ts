import type { RoomType } from '../modules/building/catalog';
import type { TextureAsset } from './assets/assetManager';

// Six frames in fixed order. High-quality original-art HD image is preferred;
// the smaller, previously published WebP remains a network/GPU fallback.
export const ROOM_ART_ASSET: TextureAsset = {
  key: 'room-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/room-atlas.webp' },
    { scale: 6.4, path: 'assets/rooms/room-atlas-hd.webp', frameWidth: 1024, frameHeight: 341 }
  ]
};

export const ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  habitat: 0,
  command: 1,
  workshop: 2,
  storage: 3,
  generator: 4,
  mine: 5
};

/**
 * Distinct two-cell Level 1 interiors. Frames are vertically stacked:
 * kitchen, ventilation, recreation and guard post.
 * Both WebP variants are produced from one approved illustration sheet;
 * never remap these rooms to another room type's artwork.
 */
export const MISSING_ROOM_ART_ASSET: TextureAsset = {
  key: 'missing-room-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/missing-room-atlas.webp' },
    { scale: 3, path: 'assets/rooms/missing-room-atlas-hd.webp', frameWidth: 480, frameHeight: 159 }
  ]
};

export const MISSING_ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  kitchen: 0,
  ventilation: 1,
  recreation: 2,
  guardPost: 3
};

/** Two illustrated rooms, in order: hydroponics, medbay. */
export const GARDEN_MEDBAY_ART_ASSET: TextureAsset = {
  key: 'garden-medbay-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/garden-medbay-atlas.webp' },
    { scale: 6.4, path: 'assets/rooms/garden-medbay-atlas-hd.webp',
      frameWidth: 1024, frameHeight: 341 }
  ]
};

export const GARDEN_MEDBAY_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  hydroponics: 0,
  medbay: 1
};

/** Dedicated research and water-treatment interiors, in that order. */
export const LAB_WATER_ART_ASSET: TextureAsset = {
  key: 'lab-water-art', kind: 'spritesheet', frameWidth: 160, frameHeight: 53,
  filter: 'linear', variants: [
    { scale: 1, path: 'assets/rooms/lab-water-atlas.webp' },
    { scale: 6.4, path: 'assets/rooms/lab-water-atlas-hd.webp', frameWidth: 1024, frameHeight: 341 }
  ]
};
export const LAB_WATER_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  laboratory: 0, waterTreatment: 1
};

/**
 * Approved Level 2 interiors, without characters or labels.
 * Frames: power, water treatment, kitchen, medbay, laboratory.
 * These are isolated from all Level 1 spritesheets.
 */
export const LEVEL_TWO_ROOM_ART_ASSET: TextureAsset = {
  key: 'level-two-room-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/room-level-2.webp' },
    { scale: 4, path: 'assets/rooms/room-level-2-hd.webp', frameWidth: 640, frameHeight: 212 }
  ]
};

export const LEVEL_TWO_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  generator: 0,
  waterTreatment: 1,
  kitchen: 2,
  medbay: 3,
  laboratory: 4
};

export interface RoomArtCandidate { readonly key: string; readonly frame: number }

/**
 * Explicit priority keeps Level 1 artwork untouched. Until distinct Level 3
 * artwork exists, higher levels retain the upgraded look instead of regressing.
 * A missing Level 2 file/frame falls back to existing art, not to an empty room.
 */
export function roomArtCandidates(type: RoomType, level: number): RoomArtCandidate[] {
  const upgradedFrame = level >= 2 ? LEVEL_TWO_FRAME_BY_TYPE[type] : undefined;
  const missingRoomFrame = MISSING_ROOM_FRAME_BY_TYPE[type];
  const dedicated: RoomArtCandidate[] = missingRoomFrame === undefined
    ? []
    : [{ key: MISSING_ROOM_ART_ASSET.key, frame: missingRoomFrame }];
  const labWaterFrame = LAB_WATER_FRAME_BY_TYPE[type];
  const gardenMedbayFrame = GARDEN_MEDBAY_FRAME_BY_TYPE[type];
  const standardFrame = ROOM_FRAME_BY_TYPE[type];
  const legacy: RoomArtCandidate[] = labWaterFrame !== undefined
    ? [{ key: LAB_WATER_ART_ASSET.key, frame: labWaterFrame }]
    : gardenMedbayFrame !== undefined
      ? [{ key: GARDEN_MEDBAY_ART_ASSET.key, frame: gardenMedbayFrame }]
      : standardFrame !== undefined
        ? [{ key: ROOM_ART_ASSET.key, frame: standardFrame }]
        : [];
  return upgradedFrame === undefined
    ? [...dedicated, ...legacy]
    : [{ key: LEVEL_TWO_ROOM_ART_ASSET.key, frame: upgradedFrame }, ...dedicated, ...legacy];
}
