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
 * Level 1 interiors for the four previously missing or shared room sprites.
 * Two columns × two rows, row-major frame order:
 * kitchen (0), recreation (1), guardPost (2), ventilation (3).
 * Source art is a native high-resolution, label-free industrial cutaway.
 */
export const MISSING_ROOM_ART_ASSET: TextureAsset = {
  key: 'missing-room-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/missing-room-atlas.webp' },
    { scale: 3.5, path: 'assets/rooms/missing-room-atlas-hd.webp', frameWidth: 560, frameHeight: 186 }
  ]
};

export const MISSING_ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  kitchen: 0,
  recreation: 1,
  guardPost: 2,
  ventilation: 3
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


/**
 * Eight newly illustrated Level 2 interiors. Each frame is two cells wide.
 * Row-major order: habitat, hydroponics, workshop, storage, mine,
 * recreation, guardPost, ventilation.
 * The revised 3.5x atlas uses new cutaway interiors cropped from original large artwork; no text/UI labels are inside game textures.
 */
export const LEVEL_TWO_ADDITIONAL_ART_ASSET: TextureAsset = {
  key: 'level-two-additional-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/level2-additions-v2.webp' },
    { scale: 3.5, path: 'assets/rooms/level2-additions-v2-hd.webp', frameWidth: 560, frameHeight: 186 }
  ]
};

export const LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  habitat: 0,
  hydroponics: 1,
  workshop: 2,
  storage: 3,
  mine: 4,
  recreation: 5,
  guardPost: 6,
  ventilation: 7
};

/** Command center is three cells wide and uses a panoramic frame. */
export const LEVEL_TWO_COMMAND_ART_ASSET: TextureAsset = {
  key: 'level-two-command-art',
  kind: 'spritesheet',
  frameWidth: 240,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/level2-command-v2.webp' },
    { scale: 3.5, path: 'assets/rooms/level2-command-v2-hd.webp', frameWidth: 840, frameHeight: 186 }
  ]
};

export interface RoomArtCandidate { readonly key: string; readonly frame: number }

/**
 * Explicit priority keeps Level 1 artwork untouched. Until distinct Level 3
 * artwork exists, higher levels retain the upgraded look instead of regressing.
 * A missing Level 2 file/frame falls back to existing art, not to an empty room.
 */
export function roomArtCandidates(type: RoomType, level: number): RoomArtCandidate[] {
  const upgradedFrame = level >= 2 ? LEVEL_TWO_FRAME_BY_TYPE[type] : undefined;
  const levelOneFrame = MISSING_ROOM_FRAME_BY_TYPE[type];
  const dedicated: RoomArtCandidate[] = levelOneFrame === undefined
    ? []
    : [{ key: MISSING_ROOM_ART_ASSET.key, frame: levelOneFrame }];
  const additionalFrame = level >= 2 ? LEVEL_TWO_ADDITIONAL_FRAME_BY_TYPE[type] : undefined;
  const commandFrame = level >= 2 && type === 'command' ? 0 : undefined;
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
  if (upgradedFrame !== undefined) {
    return [{ key: LEVEL_TWO_ROOM_ART_ASSET.key, frame: upgradedFrame }, ...dedicated, ...legacy];
  }
  if (additionalFrame !== undefined) {
    return [{ key: LEVEL_TWO_ADDITIONAL_ART_ASSET.key, frame: additionalFrame }, ...dedicated, ...legacy];
  }
  if (commandFrame !== undefined) {
    return [{ key: LEVEL_TWO_COMMAND_ART_ASSET.key, frame: commandFrame }, ...dedicated, ...legacy];
  }
  return [...dedicated, ...legacy];
}
